import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStagedUpload, deleteStagedUpload } from "@/lib/parsing/staging-store";
import { runEnrichmentWaterfall } from "@/lib/enrichment/waterfall";
import { computeTimelineWins } from "@/lib/enrichment/wins-engine";

export const runtime = "nodejs";
export const maxDuration = 120; // small-batch synchronous enrichment can take a little while

const MappingSchema = z.object({
  stagingId: z.string().uuid(),
  mapping: z.object({
    firstName: z.string().min(1, "First Name column must be mapped"),
    lastName: z.string().min(1, "Last Name column must be mapped"),
    email: z.string().min(1, "Email column must be mapped"),
  }),
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parseResult = MappingSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.errors.map((e) => e.message).join("; ") },
      { status: 400 }
    );
  }

  const { stagingId, mapping } = parseResult.data;
  const staged = getStagedUpload(stagingId);

  if (!staged) {
    return NextResponse.json(
      { error: "This upload session has expired or was not found. Please re-upload your file." },
      { status: 404 }
    );
  }

  const { headers, rows } = staged.parsed;
  for (const field of [mapping.firstName, mapping.lastName, mapping.email]) {
    if (!headers.includes(field)) {
      return NextResponse.json(
        { error: `Mapped column "${field}" does not exist in the uploaded file.` },
        { status: 400 }
      );
    }
  }

  // Create the batch record up front so we have a durable ID even if
  // enrichment partially fails partway through.
  const batch = await prisma.uploadBatch.create({
    data: {
      fileName: staged.fileName,
      originalFileType: staged.fileType,
      status: "PROCESSING",
      columnMapping: mapping,
      rawRowCount: rows.length,
    },
  });

  const validRows = rows.filter((row) => {
    const email = row[mapping.email]?.trim();
    const firstName = row[mapping.firstName]?.trim();
    const lastName = row[mapping.lastName]?.trim();
    return email && firstName && lastName && EMAIL_REGEX.test(email);
  });

  const skippedCount = rows.length - validRows.length;

  // Process sequentially with bounded concurrency to stay within small-batch
  // synchronous scope while avoiding hammering rate limits on enrichment APIs.
  const CONCURRENCY = 4;
  let cursor = 0;
  const results: { row: (typeof validRows)[number]; success: boolean; error?: string }[] = [];

  async function worker() {
    while (cursor < validRows.length) {
      const idx = cursor++;
      const row = validRows[idx];
      const firstName = row[mapping.firstName].trim();
      const lastName = row[mapping.lastName].trim();
      const email = row[mapping.email].trim();

      try {
        const enrichment = await runEnrichmentWaterfall({ firstName, lastName, email });
        const timelineWins = computeTimelineWins(enrichment.careerHistory);

        await prisma.enrichedAttendee.create({
          data: {
            batchId: batch.id,
            firstName,
            lastName,
            email,
            jobTitle: enrichment.jobTitle,
            company: enrichment.company,
            industry: enrichment.industry,
            linkedinUrl: enrichment.linkedinUrl,
            headshotUrl: enrichment.headshotUrl,
            interests: enrichment.interests,
            bioNotes: enrichment.bioNotes,
            careerHistory: enrichment.careerHistory as object[],
            enrichmentStatus: enrichment.success
              ? enrichment.tier === 1
                ? "ENRICHED_TIER1"
                : "ENRICHED_TIER2"
              : "FAILED",
            enrichmentTier: enrichment.tier,
            enrichmentError: enrichment.error,
            timelineWins,
          },
        });

        results.push({ row, success: enrichment.success });
      } catch (err) {
        // Enrichment API failures must never crash the batch — persist a
        // failed-state record so it surfaces an inline error on the card.
        const message = err instanceof Error ? err.message : "Unknown enrichment error";
        await prisma.enrichedAttendee.create({
          data: {
            batchId: batch.id,
            firstName,
            lastName,
            email,
            enrichmentStatus: "FAILED",
            enrichmentError: message,
            timelineWins: [],
          },
        });
        results.push({ row, success: false, error: message });
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, validRows.length || 1) }, worker));

    await prisma.uploadBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        errorMessage:
          skippedCount > 0
            ? `${skippedCount} row(s) were skipped due to missing or invalid required fields.`
            : null,
      },
    });
  } catch (err) {
    console.error("Batch processing failed unexpectedly:", err);
    await prisma.uploadBatch.update({
      where: { id: batch.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown batch processing error",
      },
    });
    return NextResponse.json(
      { error: "Batch processing failed.", batchId: batch.id },
      { status: 500 }
    );
  } finally {
    deleteStagedUpload(stagingId);
  }

  return NextResponse.json({
    batchId: batch.id,
    processedCount: results.length,
    successCount: results.filter((r) => r.success).length,
    failedCount: results.filter((r) => !r.success).length,
    skippedCount,
  });
}
