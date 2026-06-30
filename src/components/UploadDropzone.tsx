"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Loader2 } from "lucide-react";
import type { StagedUploadInfo } from "@/app/page";

interface Props {
  onParsed: (info: StagedUploadInfo) => void;
  onError: (message: string) => void;
}

export default function UploadDropzone({ onParsed, onError }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed.");
        }

        onParsed({
          stagingId: data.stagingId,
          fileName: data.fileName,
          headers: data.headers,
          previewRows: data.previewRows,
          totalRows: data.totalRows,
        });
      } catch (err) {
        onError(err instanceof Error ? err.message : "An unexpected error occurred during upload.");
      } finally {
        setIsUploading(false);
      }
    },
    [onParsed, onError]
  );

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={`card cursor-pointer select-none rounded-3xl border-2 border-dashed px-8 py-16 flex flex-col items-center justify-center text-center transition-all duration-300 ${
        isDragging
          ? "border-brand-500 bg-brand-50 scale-[1.01]"
          : "border-ink-700/15 hover:border-brand-400 hover:bg-brand-50/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileSelect}
      />

      {isUploading ? (
        <>
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
          <p className="font-semibold text-ink-900">Parsing your file…</p>
          <p className="text-sm text-ink-700/60 mt-1">This usually takes a few seconds.</p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
            <UploadCloud className="w-8 h-8 text-brand-600" />
          </div>
          <p className="font-semibold text-ink-900 text-lg">
            Drag & drop your attendee file here
          </p>
          <p className="text-sm text-ink-700/60 mt-1">or click to browse</p>
          <div className="flex items-center gap-2 mt-5 text-xs font-medium text-ink-700/50">
            <FileSpreadsheet className="w-4 h-4" />
            <span>.xlsx, .xls, or .csv — up to 15MB</span>
          </div>
        </>
      )}
    </div>
  );
}
