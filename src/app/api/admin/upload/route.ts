import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parseUploadedFile, FileParseError } from "@/lib/parsing/file-parser";
import { stageUpload } from "@/lib/parsing/staging-store";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const PREVIEW_ROW_COUNT = 5;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file was provided in the request." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB upload limit.` },
        { status: 413 }
      );
    }

    const validExtensions = [".csv", ".xlsx", ".xls"];
    const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a .csv or .xlsx file." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = parseUploadedFile(file.name, buffer);

    const stagingId = uuidv4();
    stageUpload(stagingId, file.name, file.type || "application/octet-stream", parsed);

    return NextResponse.json({
      stagingId,
      fileName: file.name,
      headers: parsed.headers,
      previewRows: parsed.rows.slice(0, PREVIEW_ROW_COUNT),
      totalRows: parsed.rows.length,
    });
  } catch (err) {
    if (err instanceof FileParseError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("Upload processing failed:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing the file. Please try again." },
      { status: 500 }
    );
  }
}
