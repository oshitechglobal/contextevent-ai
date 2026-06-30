import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;

  if (!batchId) {
    return NextResponse.json({ error: "batchId is required." }, { status: 400 });
  }

  try {
    const batch = await prisma.uploadBatch.findUnique({
      where: { id: batchId },
      include: {
        attendees: {
          orderBy: { lastName: "asc" },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found." }, { status: 404 });
    }

    return NextResponse.json({ batch });
  } catch (err) {
    console.error("Failed to fetch batch:", err);
    return NextResponse.json(
      { error: "Failed to load batch data. Please try again." },
      { status: 500 }
    );
  }
}
