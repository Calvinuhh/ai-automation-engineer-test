'use client';

import { useState, useRef, useCallback } from 'react';

interface DropZoneProps {
  onFileUploaded: (filePath: string, fileName: string) => void;
  onError: (error: string) => void;
  onUploadStart: () => void;
  uploadedFileName: string | null;
  uploadError: string | null;
  uploading: boolean;
  onReset: () => void;
  sessionToken: string;
}

function validateFile(file: File): string | null {
  if (!file.name.endsWith('.json')) {
    return 'Only JSON files are allowed';
  }
  return null;
}

export function DropZone({
  onFileUploaded,
  onError,
  onUploadStart,
  uploadedFileName,
  uploadError,
  uploading,
  onReset,
  sessionToken,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        onError(validationError);
        return;
      }

      onUploadStart();

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionToken', sessionToken);

        const res = await fetch('/api/research-files', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          onError(data.error || 'Upload failed');
          return;
        }

        onFileUploaded(data.filePath, file.name);
      } catch {
        onError('Network error during upload');
      }
    },
    [onFileUploaded, onError, onUploadStart, sessionToken]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        uploadFile(file);
      }
    },
    [uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadFile(file);
        e.target.value = '';
      }
    },
    [uploadFile]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (uploadedFileName && !uploading && !uploadError) {
    return (
      <div className="w-full px-3 py-3 border border-green-300 bg-green-50 rounded-md flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-800 font-medium">{uploadedFileName}</span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-zinc-500 hover:text-zinc-700 underline"
        >
          Change file
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`w-full px-3 py-8 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors ${
        isDragOver
          ? 'border-zinc-900 bg-zinc-100'
          : uploadError
            ? 'border-red-300 bg-red-50'
            : 'border-zinc-300 hover:border-zinc-500'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm text-zinc-500">Uploading and validating...</span>
        </div>
      ) : uploadError ? (
        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="text-sm text-red-600">{uploadError}</span>
          <span className="text-xs text-zinc-500">Click or drag to try again</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-8 h-8 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-900">Click to upload</span> or drag and drop
          </span>
          <span className="text-xs text-zinc-500">JSON files only</span>
        </div>
      )}
    </div>
  );
}
