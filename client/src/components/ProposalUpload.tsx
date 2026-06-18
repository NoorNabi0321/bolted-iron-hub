import React, { useRef, useState } from "react";
import { Upload, AlertCircle, CheckCircle2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ProposalUploadProps {
  projectId: number;
  proposalFileUrl?: string | null;
  onChecklistCreated?: () => void;
}

export default function ProposalUpload({
  projectId,
  proposalFileUrl,
  onChecklistCreated,
}: ProposalUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [extractedCount, setExtractedCount] = useState<number | null>(null);

  const uploadProposalMutation = trpc.projects.uploadProposalAndExtract.useMutation({
    onSuccess: (data) => {
      setIsUploading(false);
      setUploadStatus("success");
      setUploadedFileName(uploadedFileName || "");
      setExtractedCount(data.extractedItemsCount);

      toast.success(
        `Successfully extracted ${data.extractedItemsCount} checklist items from the proposal`
      );

      onChecklistCreated?.();

      // Reset after 3 seconds
      setTimeout(() => {
        setUploadStatus("idle");
        setUploadedFileName("");
      }, 3000);
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadStatus("error");
      const errorMsg = error.message || "Failed to upload and extract proposal";
      setErrorMessage(errorMsg);

      toast.error(errorMsg);

      // Reset after 5 seconds
      setTimeout(() => {
        setUploadStatus("idle");
        setErrorMessage("");
      }, 5000);
    },
  });

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (file.type !== "application/pdf") {
      setUploadStatus("error");
      setErrorMessage("Please upload a PDF file");
      toast.error("Only PDF files are supported");
      return;
    }

    // Validate file size (max 16MB)
    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadStatus("error");
      setErrorMessage("File size exceeds 16MB limit");
      toast.error("Maximum file size is 16MB");
      return;
    }

    // Convert file to base64 string (safely for large files)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let binaryString = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binaryString += String.fromCharCode(...Array.from(uint8Array.subarray(i, i + chunkSize)));
    }
    const base64String = btoa(binaryString);

    setIsUploading(true);
    setUploadStatus("idle");
    setErrorMessage("");
    setUploadedFileName(file.name);

    // Upload and extract
    uploadProposalMutation.mutate({
      projectId,
      fileName: file.name,
      fileBuffer: base64String,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Success State */}
      {uploadStatus === "success" && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-6 flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-green-900">Proposal Uploaded Successfully</h3>
            <p className="text-sm text-green-800 mt-1">{uploadedFileName}</p>
            <p className="text-xs text-green-700 mt-2">
              {extractedCount} checklist items have been automatically extracted and added
            </p>
            {proposalFileUrl && (
              <a
                href={proposalFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline mt-2 inline-block"
              >
                View proposal
              </a>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUploadStatus("idle")}
            className="flex-shrink-0"
          >
            Upload Another
          </Button>
        </div>
      )}

      {/* Error State */}
      {uploadStatus === "error" && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-red-900">Upload Failed</h3>
            <p className="text-sm text-red-800 mt-1">{errorMessage}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUploadStatus("idle")}
            className="flex-shrink-0"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Idle/Upload State */}
      {uploadStatus === "idle" && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-red-400 bg-red-50"
              : "border-gray-300 hover:border-red-400"
          } ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex flex-col items-center gap-3">
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
                <p className="text-sm font-medium text-gray-600">
                  Processing proposal...
                </p>
                <p className="text-xs text-gray-500">
                  Extracting checklist items from PDF
                </p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Upload a proposal to automatically generate a checklist
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF files up to 16MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClick}
                  disabled={isUploading}
                  className="mt-2 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
