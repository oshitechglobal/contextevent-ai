import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BatchWorkspace from "@/components/BatchWorkspace";
import type { BatchDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;

  const batch = await prisma.uploadBatch.findUnique({
    where: { id: batchId },
    include: { attendees: { orderBy: { lastName: "asc" } } },
  });

  if (!batch) {
    notFound();
  }

  const serialized: BatchDTO = JSON.parse(JSON.stringify(batch));

  return <BatchWorkspace initialBatch={serialized} />;
}
