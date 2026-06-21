import { useState } from "react";
import { useParams, useLocation } from "wouter";
import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ReportViewer } from "@/components/ReportViewer";
import { ArrowLeft, FileText, Loader2, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

export default function ProjectProgressDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0");
  const [, navigate] = useLocation();

  const { data: project } = trpc.projects.get.useQuery({ id: projectId });
  const { data: items = [] } = trpc.projects.getChecklistItems.useQuery({ projectId, source: "extracted" });
  const generateReport = trpc.projects.generateChecklistProgressReport.useMutation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);

  const totalCount = items.length;
  const completedCount = items.filter((i) => i.isCompleted).length;
  const completionPercentage = totalCount
    ? Math.round(items.reduce((s, i) => s + (i.progress ?? 0), 0) / totalCount)
    : 0;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const r = await generateReport.mutateAsync({ projectId });
      setReport({ ...r, subtitle: `${r.totalActions} actions this week` });
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <CRMLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate("/progress")}
            className="mt-1 p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground truncate">{project?.name ?? "..."}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {completedCount} of {totalCount} extracted items complete · {completionPercentage}% complete
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {project && <StatusBadge status={project.status} />}
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="gap-1.5 bg-red-600 hover:bg-red-700"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  Weekly Report
                </Button>
              </div>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden mt-3">
              <div
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="p-3 font-medium text-sm border-b border-border">Extracted Checklist Items</div>
          {items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No extracted checklist items.</p>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="p-3 flex items-center gap-3">
                  {item.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={`flex-1 min-w-0 text-sm break-words ${item.isCompleted ? "line-through text-gray-400" : "text-foreground"}`}>
                    {item.text}
                  </span>
                  <div className="flex items-center gap-2 w-36 flex-shrink-0">
                    <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div className="bg-green-500 h-full" style={{ width: `${item.progress ?? 0}%` }} />
                    </div>
                    <span className="text-xs font-medium tabular-nums w-9 text-right text-muted-foreground">
                      {item.progress ?? 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {report && (
        <ReportViewer
          isOpen={!!report}
          onClose={() => setReport(null)}
          pdfBase64={report.pdfBase64}
          fileName={report.fileName}
          subtitle={report.subtitle}
        />
      )}
    </CRMLayout>
  );
}
