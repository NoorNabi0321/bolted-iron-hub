import { useState, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import CRMLayout from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Trash2,
  Users,
} from "lucide-react";

interface CsvRow {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  trade: string;
  password: string;
}

interface ImportResult {
  email: string;
  companyName: string;
  status: "created" | "skipped" | "error";
  message: string;
}

type Step = "upload" | "preview" | "importing" | "results";

export default function BulkImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; created: number; skipped: number; errors: number } | null>(null);

  const importMutation = trpc.bulkImport.importRows.useMutation({
    onSuccess: (data) => {
      setResults(data.results);
      setSummary(data.summary);
      setStep("results");
      toast.success(`Import complete: ${data.summary.created} created, ${data.summary.skipped} skipped`);
    },
    onError: (err) => {
      toast.error(err.message);
      setStep("preview");
    },
  });

  function parseCsv(text: string): CsvRow[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    // Parse header
    const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/['"]/g, ""));

    // Map header names to our fields
    const colMap: Record<string, keyof CsvRow> = {};
    for (let i = 0; i < header.length; i++) {
      const h = header[i];
      if (h.includes("company") || h.includes("business")) colMap[String(i)] = "companyName";
      else if (h.includes("contact") || h.includes("name")) colMap[String(i)] = "contactName";
      else if (h.includes("email") || h.includes("mail")) colMap[String(i)] = "email";
      else if (h.includes("phone") || h.includes("tel") || h.includes("mobile")) colMap[String(i)] = "phone";
      else if (h.includes("trade") || h.includes("specialty") || h.includes("type")) colMap[String(i)] = "trade";
      else if (h.includes("password") || h.includes("pass")) colMap[String(i)] = "password";
    }

    // Parse data rows
    const parsed: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quoted fields)
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const row: CsvRow = {
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        trade: "",
        password: "",
      };

      for (let j = 0; j < values.length; j++) {
        const field = colMap[String(j)];
        if (field) {
          row[field] = values[j].replace(/^['"]|['"]$/g, "");
        }
      }

      // Only include rows with at least company name and email
      if (row.companyName && row.email) {
        parsed.push(row);
      }
    }

    return parsed;
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error("No valid rows found. Make sure your CSV has headers: companyName, contactName, email, phone, trade");
        return;
      }
      setRows(parsed);
      setStep("preview");
      toast.success(`Parsed ${parsed.length} rows from CSV`);
    };
    reader.readAsText(file);
  }

  function handleRemoveRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
    if (rows.length <= 1) {
      setStep("upload");
    }
  }

  function handleImport() {
    setStep("importing");
    importMutation.mutate({
      rows: rows.map((r) => ({
        companyName: r.companyName,
        contactName: r.contactName || undefined,
        email: r.email,
        phone: r.phone || undefined,
        trade: r.trade || undefined,
        password: r.password || undefined,
      })),
      autoApprove,
    });
  }

  function handleReset() {
    setStep("upload");
    setRows([]);
    setResults([]);
    setSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function downloadTemplate() {
    const csv = "companyName,contactName,email,phone,trade,password\nAcme Steel Co,John Smith,john@acmesteel.com,555-0101,Structural Steel,\nBolt Works Inc,Jane Doe,jane@boltworks.com,555-0202,Misc Metals,\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subcontractors_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const validationErrors = useMemo(() => {
    const errors: { row: number; message: string }[] = [];
    const emails = new Set<string>();
    rows.forEach((row, i) => {
      if (!row.companyName) errors.push({ row: i, message: "Missing company name" });
      if (!row.email) errors.push({ row: i, message: "Missing email" });
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push({ row: i, message: "Invalid email format" });
      if (emails.has(row.email.toLowerCase())) errors.push({ row: i, message: "Duplicate email" });
      emails.add(row.email.toLowerCase());
    });
    return errors;
  }, [rows]);

  return (
    <CRMLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          {step !== "upload" && (
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Start Over
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bulk Import Subcontractors</h1>
            <p className="text-gray-500 text-sm mt-1">
              Upload a CSV file to register multiple subcontractors at once
            </p>
          </div>
        </div>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-6">
            {/* Template Download */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Download className="h-5 w-5 text-red-600" />
                  Download Template
                </CardTitle>
                <CardDescription>
                  Start with our CSV template that has the correct column headers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Download CSV Template
                </Button>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <p className="font-medium mb-1">Required columns:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><strong>companyName</strong> — Subcontractor company name</li>
                    <li><strong>email</strong> — Login email address</li>
                  </ul>
                  <p className="font-medium mt-2 mb-1">Optional columns:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><strong>contactName</strong> — Contact person name</li>
                    <li><strong>phone</strong> — Phone number</li>
                    <li><strong>trade</strong> — Trade/specialty (e.g., Structural Steel)</li>
                    <li><strong>password</strong> — Login password (default: Welcome123!)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="h-5 w-5 text-red-600" />
                  Upload CSV File
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 md:p-12 text-center hover:border-red-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-gray-500 text-sm">CSV files only</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="space-y-6">
            {/* Validation Warnings */}
            {validationErrors.length > 0 && (
              <Card className="border-yellow-300 bg-yellow-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-800">Validation Issues</p>
                      <ul className="mt-1 text-sm text-yellow-700 space-y-0.5">
                        {validationErrors.slice(0, 5).map((err, i) => (
                          <li key={i}>Row {err.row + 1}: {err.message}</li>
                        ))}
                        {validationErrors.length > 5 && (
                          <li>...and {validationErrors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Options */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Auto-approve accounts</Label>
                    <p className="text-sm text-gray-500">
                      Skip the approval step — subs can log in immediately
                    </p>
                  </div>
                  <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
                </div>
              </CardContent>
            </Card>

            {/* Preview Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-red-600" />
                  Preview ({rows.length} subcontractors)
                </CardTitle>
                <CardDescription>
                  Review the data before importing. Remove any rows you don't want.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium text-gray-600">#</th>
                        <th className="text-left p-3 font-medium text-gray-600">Company</th>
                        <th className="text-left p-3 font-medium text-gray-600">Contact</th>
                        <th className="text-left p-3 font-medium text-gray-600">Email</th>
                        <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Phone</th>
                        <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Trade</th>
                        <th className="text-left p-3 font-medium text-gray-600">Password</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const rowErrors = validationErrors.filter((e) => e.row === i);
                        return (
                          <tr
                            key={i}
                            className={`border-b hover:bg-gray-50 ${rowErrors.length > 0 ? "bg-yellow-50" : ""}`}
                          >
                            <td className="p-3 text-gray-400">{i + 1}</td>
                            <td className="p-3 font-medium">{row.companyName}</td>
                            <td className="p-3 text-gray-600">{row.contactName || "—"}</td>
                            <td className="p-3 text-gray-600">{row.email}</td>
                            <td className="p-3 text-gray-600 hidden md:table-cell">{row.phone || "—"}</td>
                            <td className="p-3 text-gray-600 hidden md:table-cell">{row.trade || "—"}</td>
                            <td className="p-3 text-gray-500 text-xs">{row.password || "Welcome123!"}</td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRow(i)}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                  <Button variant="outline" onClick={handleReset}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={validationErrors.length > 0 || rows.length === 0}
                    className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Import {rows.length} Subcontractors
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <Card>
            <CardContent className="py-16 text-center">
              <Loader2 className="h-12 w-12 text-red-600 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Importing subcontractors...</p>
              <p className="text-gray-500 mt-1">
                Creating {rows.length} accounts. This may take a moment.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step: Results */}
        {step === "results" && summary && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-gray-900">{summary.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{summary.created}</p>
                  <p className="text-sm text-gray-500">Created</p>
                </CardContent>
              </Card>
              <Card className="border-yellow-200">
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-yellow-600">{summary.skipped}</p>
                  <p className="text-sm text-gray-500">Skipped</p>
                </CardContent>
              </Card>
              <Card className="border-red-200">
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-red-600">{summary.errors}</p>
                  <p className="text-sm text-gray-500">Errors</p>
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
                <CardDescription>
                  {!autoApprove && summary.created > 0 && (
                    <span className="text-yellow-600">
                      Remember to approve the new accounts in the Approvals page before they can log in.
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium text-gray-600">Status</th>
                        <th className="text-left p-3 font-medium text-gray-600">Company</th>
                        <th className="text-left p-3 font-medium text-gray-600">Email</th>
                        <th className="text-left p-3 font-medium text-gray-600">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-3">
                            {r.status === "created" && (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-4 w-4" /> Created
                              </span>
                            )}
                            {r.status === "skipped" && (
                              <span className="inline-flex items-center gap-1 text-yellow-600">
                                <AlertCircle className="h-4 w-4" /> Skipped
                              </span>
                            )}
                            {r.status === "error" && (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" /> Error
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-medium">{r.companyName}</td>
                          <td className="p-3 text-gray-600">{r.email}</td>
                          <td className="p-3 text-gray-500 text-xs">{r.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <Button variant="outline" onClick={handleReset} className="gap-2">
                    <Upload className="h-4 w-4" /> Import More
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
