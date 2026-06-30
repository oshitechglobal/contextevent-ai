import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateBioAndStarters, BioStyle, BioLength } from "@/lib/llm/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

const BIO_STYLES: BioStyle[] = ["Formal", "Conversational", "Executive"];
const BIO_LENGTHS: BioLength[] = ["Brief", "Standard", "Detailed"];

const GenerateSchema = z.object({
  attendeeId: z.string().uuid(),
  bioStyle: z.enum(["Formal", "Conversational", "Executive"]),
  bioLength: z.enum(["Brief", "Standard", "Detailed"]),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join("; ") },
      { status: 400 }
    );
  }

  const { attendeeId, bioStyle, bioLength } = parsed.data;

  const attendee = await prisma.enrichedAttendee.findUnique({ where: { id: attendeeId } });
  if (!attendee) {
    return NextResponse.json({ error: "Attendee not found." }, { status: 404 });
  }

  if (attendee.enrichmentStatus === "FAILED") {
    return NextResponse.json(
      {
        error:
          "Cannot generate a bio for this attendee — identity enrichment failed for both waterfall tiers, so there is no profile data to work from.",
      },
      { status: 422 }
    );
  }

  try {
    const timelineWins: string[] = Array.isArray(attendee.timelineWins)
      ? (attendee.timelineWins as string[])
      : [];

    const output = await generateBioAndStarters({
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      jobTitle: attendee.jobTitle,
      company: attendee.company,
      industry: attendee.industry,
      interests: attendee.interests,
      bioNotes: attendee.bioNotes,
      timelineWins,
      bioStyle,
      bioLength,
    });

    const updated = await prisma.enrichedAttendee.update({
      where: { id: attendeeId },
      data: {
        generatedBio: output.bio,
        conversationStarters: output.conversationStarters,
        bioStyle,
        bioLength,
        generatedAt: new Date(),
      },
    });

    return NextResponse.json({
      bio: updated.generatedBio,
      conversationStarters: updated.conversationStarters,
      generatedAt: updated.generatedAt,
    });
  } catch (err) {
    console.error("Bio generation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown bio generation error";
    return NextResponse.json(
      { error: `Bio generation failed: ${message}` },
      { status: 502 }
    );
  }
}
