import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface PDFViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
}

export function PDFViewerDialog({
  isOpen,
  onClose,
  pdfUrl,
  fileName,
}: PDFViewerDialogProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
  }, [pdfUrl]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b p-4 sticky top-0 bg-background z-10">
          <DialogTitle className="flex-1">{fileName}</DialogTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>
        </DialogHeader>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center">
          {isLoading && (
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            title={fileName}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
