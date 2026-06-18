import React, { useState, useEffect, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2, Loader2, FileText, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ProposalUploadSectionProps {
  projectId: number;
  proposalId?: number | null;
  proposalFileUrl?: string | null;
  extractedItemsCount?: number;
  onProposalUploaded?: () => void;
}

export function ProposalUploadSection({
  projectId,
  proposalId,
  proposalFileUrl,
  extractedItemsCount = 0,
  onProposalUploaded,
}: ProposalUploadSectionProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  // Local state for immediate UI update - synced with props
  const [localProposalFileUrl, setLocalProposalFileUrl] = useState<string | null>(proposalFileUrl || null);
  const [localExtractedItemsCount, setLocalExtractedItemsCount] = useState(extractedItemsCount);
  const [localProposalId, setLocalProposalId] = useState<number | null>(proposalId || null);

  // Sync local state with props when they change (from parent refresh)
  useEffect(() => {
    setLocalProposalFileUrl(proposalFileUrl || null);
    setLocalExtractedItemsCount(extractedItemsCount);
    setLocalProposalId(proposalId || null);
  }, [proposalFileUrl, extractedItemsCount, proposalId]);

  const utils = trpc.useUtils();
  
  const uploadProposalMutation = trpc.projects.uploadProposalAndExtract.useMutation({
    onSuccess: (data: any) => {
      setIsUploading(false);
      // Update local state immediately for instant UI feedback
      setLocalProposalFileUrl(data.fileUrl);
      setLocalExtractedItemsCount(data.extractedItemsCount || 0);
      setLocalProposalId(data.proposalId);
      toast.success("Proposal uploaded and checklist extracted successfully");
      // Invalidate the extracted checklist items query to refetch from server
      utils.projects.getChecklistItems.invalidate({ projectId, source: "extracted" });
      // Refresh parent data in background (no delay needed, just call it)
      onProposalUploaded?.();
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error(error.message || "Failed to upload proposal");
    },
  });

  const deleteProposalMutation = trpc.projects.deleteProposal.useMutation({
    onSuccess: () => {
      // Update local state immediately
      setLocalProposalFileUrl(null);
      setLocalExtractedItemsCount(0);
      setLocalProposalId(null);
      toast.success("Proposal and checklist cleared successfully");
      // Refresh parent data in background
      onProposalUploaded?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to clear proposal");
    },
  });

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.includes("pdf")) {
      toast.error("Please select a PDF file");
      return;
    }

    // If proposal already exists, show confirmation dialog
    if (localProposalFileUrl) {
      setPendingFile(file);
      setShowReplaceConfirm(true);
      return;
    }

    // Upload the file
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setPendingFile(null);

    try {
      const fileBuffer = await file.arrayBuffer();
      // Convert ArrayBuffer to base64 using browser API
      const uint8Array = new Uint8Array(fileBuffer);
      let binaryString = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const base64String = btoa(binaryString);

      uploadProposalMutation.mutate({
        projectId,
        fileName: file.name,
        fileBase64: base64String,
      });
    } catch (error) {
      setIsUploading(false);
      console.error("File read error:", error);
      toast.error("Failed to read file");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleOpenPDF = () => {
    // Use local state, not prop
    if (localProposalFileUrl) {
      window.open(localProposalFileUrl, "_blank");
    }
  };

  const handleClearChecklist = () => {
    setShowClearConfirm(true);
  };

  const confirmClearChecklist = () => {
    setShowClearConfirm(false);
    // Use local state, not prop
    if (localProposalId) {
      deleteProposalMutation.mutate({ proposalId: localProposalId });
    } else {
      toast.error("Proposal ID not found");
    }
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Proposal Upload & Auto-Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {localProposalFileUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Proposal Uploaded</p>
                    <p className="text-xs text-green-700">
                      {localExtractedItemsCount} checklist items extracted
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleOpenPDF}
                  className="p-1 hover:bg-green-100 rounded transition-colors"
                  aria-label="Open PDF in new tab"
                  title="Open PDF in new tab"
                >
                  <ExternalLink className="w-4 h-4 text-green-600 hover:text-green-700" />
                </button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClick}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Replace Proposal
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearChecklist}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteProposalMutation.isPending}
                >
                  {deleteProposalMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Checklist
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClick}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-border hover:border-blue-400 hover:bg-blue-50/50"
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Upload Proposal PDF</p>
              <p className="text-xs text-muted-foreground mt-1">
                Drag and drop or click to select a PDF file
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Replace Confirmation Dialog */}
      <AlertDialog open={showReplaceConfirm} onOpenChange={setShowReplaceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the existing proposal and all associated checklist items, then
              extract new items from the new proposal. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingFile) {
                  uploadFile(pendingFile);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Replace
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Checklist Confirmation Dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Proposal Checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you really want to clear the proposal checklist? This will remove the PDF and all associated checklist items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearChecklist}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
