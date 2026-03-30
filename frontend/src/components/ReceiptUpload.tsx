import React, { useRef, useState } from "react";
import { getUploadUrl } from "../features/api.js";

interface ReceiptUploadProps {
  onUploadComplete?: (key: string) => void;
  onUploadError?: (error: string) => void;
}

const ReceiptUpload: React.FC<ReceiptUploadProps> = ({
  onUploadComplete,
  onUploadError,
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      onUploadError?.("Please select a valid image file (JPG, PNG) or PDF");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onUploadError?.("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      return;
    }

    setPreview(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      onUploadError?.("Please select a file first");
      return;
    }

    setUploading(true);

    try {
      const uploadUrlResponse = await getUploadUrl(selectedFile);
      const response = await fetch(uploadUrlResponse.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      onUploadComplete?.(uploadUrlResponse.key);
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      onUploadError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />

        {!selectedFile ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                {dragActive ? "Drop your receipt here" : "Upload receipt"}
              </p>
              <p className="text-sm text-gray-500 mt-1">Drag and drop or click to select</p>
              <p className="text-xs text-gray-400 mt-2">JPG, PNG, PDF up to 10MB</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {preview ? (
              <div className="flex justify-center">
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="max-h-48 max-w-full rounded-lg shadow-md"
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="bg-gray-100 rounded-lg p-4">
                  <svg
                    className="w-16 h-16 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            <div className="flex justify-center space-x-2">
              <button
                onClick={handleRemoveFile}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Remove
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        )}
      </div>

      {uploading && (
        <div className="mt-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Processing receipt...</span>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            This may take a few moments as we extract information from your receipt
          </p>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-1">How it works:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>- Upload a receipt image or PDF</li>
          <li>- We will automatically extract amount, date, and merchant</li>
          <li>- An expense will be created with the extracted data</li>
          <li>- You can edit the expense if needed</li>
        </ul>
      </div>
    </div>
  );
};

export default ReceiptUpload;
