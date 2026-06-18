import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useState } from "react";

interface WeeklyReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBase64: string;
  fileName: string;
  totalProjects: number;
  totalCompleted: number;
  totalItems: number;
}

export function WeeklyReportViewer({
  isOpen,
  onClose,
  pdfBase64,
  fileName,
  totalProjects,
  totalCompleted,
  totalItems,
}: WeeklyReportViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      // Convert base64 to blob
      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex-1">
            <DialogTitle className="text-xl">{fileName}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {totalProjects} projects • {totalItems} items • {totalCompleted} completed
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-gray-100 rounded-lg">
          <iframe
            src={`data:application/pdf;base64,${pdfBase64}`}
            className="w-full h-full"
            title={fileName}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-2 bg-red-600 hover:bg-red-700"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
