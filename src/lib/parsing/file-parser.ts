import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

const MAX_ROWS = 5000; // sane safety cap for a synchronous small-batch pipeline

export class FileParseError extends Error {}

function normalizeRows(rawRows: Record<string, unknown>[]): Record<string, string>[] {
  return rawRows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = value === null || value === undefined ? "" : String(value).trim();
    }
    return normalized;
  });
}

function parseCsv(buffer: Buffer): ParsedFile {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    const fatal = result.errors.filter((e) => e.type === "Delimiter" || e.type === "Quotes");
    if (fatal.length > 0) {
      throw new FileParseError(`CSV parsing failed: ${fatal[0].message}`);
    }
  }

  const headers = result.meta.fields ?? [];
  if (headers.length === 0) {
    throw new FileParseError("CSV file has no detectable header row.");
  }

  if (result.data.length === 0) {
    throw new FileParseError("CSV file contains a header row but no data rows.");
  }

  if (result.data.length > MAX_ROWS) {
    throw new FileParseError(
      `File contains ${result.data.length} rows, exceeding the ${MAX_ROWS}-row limit for synchronous processing.`
    );
  }

  return { headers, rows: normalizeRows(result.data) };
}

function parseXlsx(buffer: Buffer): ParsedFile {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch (err) {
    throw new FileParseError(
      `Could not read Excel file — it may be corrupted or password-protected. (${
        err instanceof Error ? err.message : "unknown error"
      })`
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new FileParseError("Excel file contains no sheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (json.length === 0) {
    throw new FileParseError(`Sheet "${sheetName}" contains a header row but no data rows.`);
  }

  if (json.length > MAX_ROWS) {
    throw new FileParseError(
      `File contains ${json.length} rows, exceeding the ${MAX_ROWS}-row limit for synchronous processing.`
    );
  }

  const headers = Object.keys(json[0]);

  return { headers, rows: normalizeRows(json) };
}

/**
 * Epic 1 — Bulk File Ingestion (parsing layer).
 * Dispatches to the correct parser based on file extension / mimetype and
 * returns headers + normalized string rows ready for the column-mapping
 * wizard. Throws FileParseError with a user-safe message on any failure.
 */
export function parseUploadedFile(fileName: string, buffer: Buffer): ParsedFile {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".csv")) {
    return parseCsv(buffer);
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseXlsx(buffer);
  }

  throw new FileParseError(
    `Unsupported file type for "${fileName}". Please upload a .csv or .xlsx file.`
  );
}
