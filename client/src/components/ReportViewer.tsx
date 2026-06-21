import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";

interface ReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBase64: string;
  fileName: string;
  subtitle?: string;
}

/** Simple in-dialog PDF viewer with a download button (view-now base64 reports). */
export function ReportViewer({ isOpen, onClose, pdfBase64, fileName, subtitle }: ReportViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      const binary = atob(pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
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
        <DialogHeader>
          <DialogTitle className="text-xl">{fileName}</DialogTitle>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-gray-100 rounded-lg min-h-[60vh]">
          <iframe
            src={`data:application/pdf;base64,${pdfBase64}`}
            className="w-full h-full min-h-[60vh]"
            title={fileName}
          />
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleDownload} disabled={isDownloading} className="gap-2 bg-red-600 hover:bg-red-700">
            <Download className="w-4 h-4" />
            {isDownloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
