"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  Filter,
  Users,
  Package,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import type {
  ImportValidationSummary,
  ValidatedCustomerData,
  ValidatedProductData,
  ValidatedRow,
  ImportIssue,
} from "@/services/import";

type ImportType = "customer" | "product";
type FilterMode = "ALL" | "VALID" | "ERROR" | "DUPLICATE";

interface ImportExecutionResult {
  success: boolean;
  type: "customer" | "product";
  totalReceived: number;
  importedCount: number;
  skippedCount: number;
  importedIds: string[];
  errors: { rowNumber?: number; message: string }[];
}

export function ImportClientShell({ initialType = "customer" }: { initialType?: ImportType }) {
  const [activeTab, setActiveTab] = useState<ImportType>(initialType);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewSummary, setPreviewSummary] = useState<
    ImportValidationSummary<ValidatedCustomerData | ValidatedProductData> | null
  >(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");

  const [isExecuting, setIsExecuting] = useState(false);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setPreviewSummary(null);
    setValidationError(null);
    setImportResult(null);
    setFilterMode("ALL");
    setShowConfirmModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTabChange = (tab: ImportType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    resetState();
  };

  const handleFileSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "csv", "xls"].includes(ext)) {
      setValidationError("Invalid file format. Please upload a .xlsx or .csv spreadsheet.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setValidationError("File exceeds maximum allowed limit of 5 MB.");
      return;
    }

    setSelectedFile(file);
    setValidationError(null);
    setPreviewSummary(null);
    setImportResult(null);
    validateFile(file, activeTab);
  };

  const validateFile = async (file: File, type: ImportType) => {
    setIsValidating(true);
    setValidationError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    try {
      const res = await fetch("/api/import/validate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to validate spreadsheet");
      }

      setPreviewSummary(data.summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error validating file";
      setValidationError(msg);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewSummary || previewSummary.validCount === 0) return;

    setIsExecuting(true);
    setShowConfirmModal(false);

    try {
      const res = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab,
          rows: previewSummary.rows,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to execute import");
      }

      setImportResult(data.result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error importing records";
      setValidationError(msg);
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredRows = React.useMemo(() => {
    if (!previewSummary) return [];
    if (filterMode === "ALL") return previewSummary.rows;
    return previewSummary.rows.filter((r) => r.status === filterMode);
  }, [previewSummary, filterMode]);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-indigo-400" />
            Master Data Import
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Batch import customers and products with strict validation, duplicate detection, and accounting isolation.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="inline-flex rounded-lg bg-slate-900/90 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => handleTabChange("customer")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "customer"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            Customers
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("product")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "product"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Package className="w-4 h-4" />
            Products & Inventory
          </button>
        </div>
      </div>

      {/* Success Result View */}
      {importResult && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-slate-100 shadow-xl space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1 flex-1">
              <h2 className="text-xl font-bold text-emerald-300">
                Master Data Import Completed Successfully!
              </h2>
              <p className="text-sm text-slate-300">
                Successfully committed{" "}
                <span className="font-semibold text-emerald-400 text-base">
                  {importResult.importedCount}
                </span>{" "}
                new {activeTab === "customer" ? "customer" : "product"} record(s) to the system.
                {importResult.skippedCount > 0 && (
                  <span className="text-slate-400 ml-1">
                    ({importResult.skippedCount} invalid/duplicate rows were safely skipped).
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={activeTab === "customer" ? "/contacts" : "/products"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
            >
              <Eye className="w-4 h-4" />
              View {activeTab === "customer" ? "Contacts" : "Products"} List
            </Link>
            <button
              type="button"
              onClick={resetState}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Import Another File
            </button>
          </div>
        </div>
      )}

      {!importResult && (
        <>
          {/* Step 1: Download Templates Guide */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Step 1: Download Official Template
                </span>
                <h3 className="text-base font-semibold text-white">
                  {activeTab === "customer" ? "Customer Master Data Template" : "Product & Inventory Template"}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeTab === "customer"
                    ? "Columns: Name (required), Email, Phone, Address, GSTIN (15 chars), Type (CUSTOMER / VENDOR / BOTH)"
                    : "Columns: SKU (required), Product Name (required), Category, Selling Price, Cost Price, GST Rate (0, 5, 12, 18, 28%), Opening Stock"}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <a
                  href={`/api/import/template?type=${activeTab}&format=csv`}
                  download
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  Download CSV
                </a>
                <a
                  href={`/api/import/template?type=${activeTab}&format=xlsx`}
                  download
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  Download Excel (.xlsx)
                </a>
              </div>
            </div>
          </div>

          {/* Step 2: Upload Zone */}
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              dragActive
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-3.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 shadow-inner">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Drop your {activeTab === "customer" ? "Customer" : "Product"} file here or{" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-400 hover:text-indigo-300 underline font-medium"
                  >
                    browse computer
                  </button>
                </p>
                <p className="text-xs text-slate-500">
                  Accepts standard .xlsx and .csv files up to 5 MB. Formulas & macros are automatically stripped.
                </p>
              </div>

              {selectedFile && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 mt-2">
                  <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-mono">{selectedFile.name}</span>
                  <span className="text-slate-500">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Validation Progress Spinner */}
          {isValidating && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex items-center justify-center gap-3 text-slate-300">
              <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
              <span className="text-sm font-medium">
                Parsing spreadsheet, checking headers, and scanning for duplicates...
              </span>
            </div>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-rose-200 flex items-start gap-3 text-sm">
              <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-rose-300">Upload Issue:</strong>{" "}
                {validationError}
              </div>
            </div>
          )}

          {/* Step 3: Interactive Validation Preview */}
          {previewSummary && (
            <div className="space-y-4">
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                    Total Rows
                  </span>
                  <p className="text-2xl font-bold text-white mt-1">
                    {previewSummary.totalRows}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">
                      Ready to Import
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-300 mt-1">
                    {previewSummary.validCount}
                  </p>
                </div>

                <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-rose-400 font-medium uppercase tracking-wider">
                      Errors
                    </span>
                    <XCircle className="w-4 h-4 text-rose-400" />
                  </div>
                  <p className="text-2xl font-bold text-rose-300 mt-1">
                    {previewSummary.errorCount}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">
                      Duplicates
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold text-amber-300 mt-1">
                    {previewSummary.duplicateCount}
                  </p>
                </div>
              </div>

              {/* Filter Tabs & Preview Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Filter Preview:
                  </span>
                  <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
                    {(["ALL", "VALID", "ERROR", "DUPLICATE"] as FilterMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setFilterMode(mode)}
                        className={`px-3 py-1 rounded-md transition-all ${
                          filterMode === mode
                            ? "bg-indigo-600 text-white font-medium"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {mode === "ALL" && `All (${previewSummary.totalRows})`}
                        {mode === "VALID" && `Valid (${previewSummary.validCount})`}
                        {mode === "ERROR" && `Errors (${previewSummary.errorCount})`}
                        {mode === "DUPLICATE" && `Duplicates (${previewSummary.duplicateCount})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confirm Import Action Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetState}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={previewSummary.validCount === 0 || isExecuting}
                    onClick={() => setShowConfirmModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Confirm & Import {previewSummary.validCount} Valid Row(s)
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
                <div className="overflow-x-auto max-h-[450px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-3 w-16">Row #</th>
                        <th className="py-3 px-3 w-28">Status</th>
                        {activeTab === "customer" ? (
                          <>
                            <th className="py-3 px-3">Name</th>
                            <th className="py-3 px-3">Email</th>
                            <th className="py-3 px-3">Phone</th>
                            <th className="py-3 px-3">GSTIN</th>
                            <th className="py-3 px-3">Type</th>
                          </>
                        ) : (
                          <>
                            <th className="py-3 px-3">SKU</th>
                            <th className="py-3 px-3">Product Name</th>
                            <th className="py-3 px-3">Category</th>
                            <th className="py-3 px-3 text-right">Selling Price</th>
                            <th className="py-3 px-3 text-right">Cost Price</th>
                            <th className="py-3 px-3 text-center">GST Rate</th>
                            <th className="py-3 px-3 text-center">Opening Stock</th>
                          </>
                        )}
                        <th className="py-3 px-3">Issues / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-normal">
                      {filteredRows.map((row) => {
                        const isCustomer = activeTab === "customer";
                        const custData = isCustomer ? (row.data as ValidatedCustomerData | undefined) : null;
                        const prodData = !isCustomer ? (row.data as ValidatedProductData | undefined) : null;

                        return (
                          <tr
                            key={row.rowNumber}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              row.status === "ERROR"
                                ? "bg-rose-950/10"
                                : row.status === "DUPLICATE"
                                ? "bg-amber-950/10"
                                : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              #{row.rowNumber}
                            </td>

                            <td className="py-2.5 px-3">
                              {row.status === "VALID" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> VALID
                                </span>
                              )}
                              {row.status === "ERROR" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  <XCircle className="w-3 h-3" /> ERROR
                                </span>
                              )}
                              {row.status === "DUPLICATE" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  <AlertTriangle className="w-3 h-3" /> DUPLICATE
                                </span>
                              )}
                            </td>

                            {isCustomer ? (
                              <>
                                <td className="py-2.5 px-3 font-medium text-white">
                                  {custData?.name || String(row.raw.Name || row.raw.name || "—")}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300">
                                  {custData?.email || String(row.raw.Email || row.raw.email || "—")}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300">
                                  {custData?.phone || String(row.raw.Phone || row.raw.phone || "—")}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-xs text-indigo-300">
                                  {custData?.gstin || String(row.raw.GSTIN || row.raw.gstin || "—")}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400">
                                  {custData?.type || String(row.raw.Type || row.raw.type || "CUSTOMER")}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2.5 px-3 font-mono font-semibold text-indigo-300">
                                  {prodData?.sku || String(row.raw.SKU || row.raw.sku || "—")}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-white">
                                  {prodData?.name || String(row.raw["Product Name"] || row.raw.name || "—")}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400">
                                  {prodData?.category || String(row.raw.Category || "Furniture")}
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-emerald-400">
                                  ₹{(prodData?.sellingPrice ?? Number(row.raw["Selling Price"] || 0)).toLocaleString("en-IN")}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-300">
                                  ₹{(prodData?.costPrice ?? Number(row.raw["Cost Price"] || 0)).toLocaleString("en-IN")}
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-300">
                                  {prodData?.gstRate ?? String(row.raw["GST Rate"] || "18")}%
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-200">
                                  {prodData?.openingStock ?? String(row.raw["Opening Stock"] || "0")}
                                </td>
                              </>
                            )}

                            <td className="py-2.5 px-3 max-w-xs">
                              {row.errors.length > 0 && (
                                <div className="space-y-1">
                                  {row.errors.map((err: ImportIssue, i: number) => (
                                    <div
                                      key={i}
                                      className="inline-block px-2 py-0.5 rounded text-[11px] bg-rose-950/60 border border-rose-800/40 text-rose-300 mr-1 mb-0.5"
                                    >
                                      <strong className="font-semibold">{err.field}:</strong> {err.message}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {row.warnings.length > 0 && (
                                <div className="space-y-1 mt-0.5">
                                  {row.warnings.map((warn: ImportIssue, i: number) => (
                                    <div
                                      key={i}
                                      className="inline-block px-2 py-0.5 rounded text-[11px] bg-amber-950/60 border border-amber-800/40 text-amber-300 mr-1 mb-0.5"
                                    >
                                      <strong className="font-semibold">{warn.field}:</strong> {warn.message}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {row.errors.length === 0 && row.warnings.length === 0 && (
                                <span className="text-slate-500 text-[11px]">Ready</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && previewSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Confirm Master Data Import</h3>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              You are about to import{" "}
              <strong className="text-emerald-400 font-semibold">{previewSummary.validCount}</strong> valid{" "}
              {activeTab === "customer" ? "customer" : "product"} record(s) into the database.
            </p>

            {(previewSummary.errorCount > 0 || previewSummary.duplicateCount > 0) && (
              <div className="rounded-lg bg-amber-950/30 border border-amber-500/30 p-3 text-xs text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Note on Skipped Rows
                </div>
                <p>
                  {previewSummary.errorCount + previewSummary.duplicateCount} row(s) contain errors or duplicates and will be safely excluded from this import.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecuting}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg transition-all"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Commit Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
