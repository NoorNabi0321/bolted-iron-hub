import React, { useState, useEffect } from "react";
import { Upload, CheckCircle2, Loader2, ExternalLink, Plus } from "lucide-react";
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
  proposalFileName?: string | null;
  proposalFileUrl?: string | null;
  extractedItemsCount?: number;
  onProposalUploaded?: () => void;
}

type UploadMode = "replace" | "append";

export function ProposalUploadSection({
  projectId,
  proposalId,
  proposalFileName,
  proposalFileUrl,
  extractedItemsCount = 0,
  onProposalUploaded,
}: ProposalUploadSectionProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingMode, setPendingMode] = useState<UploadMode>("append");
  
  // Local state for immediate UI update - synced with props
  const [localProposalFileUrl, setLocalProposalFileUrl] = useState<string | null>(proposalFileUrl || null);
  const [localProposalFileName, setLocalProposalFileName] = useState<string | null>(proposalFileName || null);
  const [localExtractedItemsCount, setLocalExtractedItemsCount] = useState(extractedItemsCount);
  const [localProposalId, setLocalProposalId] = useState<number | null>(proposalId || null);

  const { data: proposal } = trpc.projects.getProposal.useQuery({ projectId });
  const { data: extractedItems = [] } = trpc.projects.getChecklistItems.useQuery({
    projectId,
    source: "extracted",
  });

  // Sync local state with props when they change (from parent refresh)
  useEffect(() => {
    setLocalProposalFileUrl(proposal?.fileUrl || proposalFileUrl || null);
    setLocalProposalFileName(proposal?.fileName || proposalFileName || null);
    setLocalExtractedItemsCount(proposal?.extractedItemsCount ?? extractedItemsCount);
    setLocalProposalId(proposal?.id || proposalId || null);
  }, [proposal, proposalFileUrl, proposalFileName, extractedItemsCount, proposalId]);

  const utils = trpc.useUtils();
  
  const uploadProposalMutation = trpc.projects.uploadProposalAndExtract.useMutation({
    onSuccess: (data: any) => {
      setIsUploading(false);
      // Update local state immediately for instant UI feedback
      setLocalProposalFileUrl(data.fileUrl);
      setLocalProposalFileName(data.fileName);
      setLocalExtractedItemsCount(data.extractedItemsCount || 0);
      setLocalProposalId(data.proposalId);
      toast.success(
        data.mode === "append"
          ? `Added ${data.extractedItemsCount || 0} checklist items`
          : `Replaced checklist with ${data.extractedItemsCount || 0} extracted items`
      );
      // Invalidate the extracted checklist items query to refetch from server
      utils.projects.getChecklistItems.invalidate({ projectId, source: "extracted" });
      utils.projects.getProposal.invalidate({ projectId });
      // Refresh parent data in background (no delay needed, just call it)
      onProposalUploaded?.();
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error(error.message || "Failed to upload proposal");
    },
  });

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.includes("pdf")) {
      toast.error("Please select a PDF file");
      return;
    }

    // Replacing an existing extracted checklist is destructive, so confirm it.
    if (localProposalFileUrl && pendingMode === "replace") {
      setPendingFile(file);
      setShowReplaceConfirm(true);
      return;
    }

    // Upload the file
    await uploadFile(file, pendingMode);
  };

  const uploadFile = async (file: File, mode: UploadMode) => {
    setIsUploading(true);
    setPendingFile(null);
    setShowReplaceConfirm(false);

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
        mode,
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

  const handleClick = (mode: UploadMode = "replace") => {
    setPendingMode(mode);
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
    e.currentTarget.value = "";
  };

  const handleOpenPDF = () => {
    // Use local state, not prop
    if (localProposalFileUrl) {
      window.open(localProposalFileUrl, "_blank");
    }
  };

  const totalExtractedItems = extractedItems.length;

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
                    <p className="text-xs font-medium text-green-800">
                      {localProposalFileName || "Uploaded proposal PDF"}
                    </p>
                    <p className="text-xs text-green-700">
                      {localExtractedItemsCount} checklist items extracted from latest PDF
                      {totalExtractedItems !== localExtractedItemsCount &&
                        ` (${totalExtractedItems} total extracted items)`}
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

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClick("append")}
                disabled={isUploading}
                className="w-full sm:w-auto"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Checklist Items
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => handleClick("append")}
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
            <AlertDialogTitle>Replace extracted checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the current extracted checklist items and build a new extracted
              checklist from the selected proposal PDF. This does not affect the manual checklist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingFile) {
                  uploadFile(pendingFile, "replace");
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Replace
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
