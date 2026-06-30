import { ParsedFile } from "./file-parser";

interface StagedUpload {
  fileName: string;
  fileType: string;
  parsed: ParsedFile;
  expiresAt: number;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes — plenty for a user to complete the mapping wizard

// Module-level singleton store. Survives across requests within the same
// server process (fine for local dev / single-instance deployments such as
// Railway/Render/a single Vercel serverless region with in-memory reuse).
// For multi-instance production scaling, swap this for Redis — the
// interface below (get/set/delete) is intentionally minimal to make that
// swap a one-file change.
const globalForStaging = globalThis as unknown as {
  __stagedUploads: Map<string, StagedUpload> | undefined;
};

const store = globalForStaging.__stagedUploads ?? new Map<string, StagedUpload>();
globalForStaging.__stagedUploads = store;

function sweepExpired() {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt < now) store.delete(key);
  }
}

export function stageUpload(id: string, fileName: string, fileType: string, parsed: ParsedFile): void {
  sweepExpired();
  store.set(id, { fileName, fileType, parsed, expiresAt: Date.now() + TTL_MS });
}

export function getStagedUpload(id: string): StagedUpload | null {
  sweepExpired();
  return store.get(id) ?? null;
}

export function deleteStagedUpload(id: string): void {
  store.delete(id);
}
