import React, { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Search, Calendar, FileSpreadsheet, AlertCircle, RefreshCw, BarChart3, AlertTriangle, Printer } from "lucide-react";
import { generateChequePDF } from "../utils/pdfGenerator";
import type { ChequeRecord, PrinterProfile } from "../utils/pdfGenerator";

interface LedgerRecord {
  id: string;
  payeeName: string;
  amount: number;
  chequeDate: string;
  bankName: string;
  acPayee: boolean;
  notes?: string;
  status: string;
  createdAt: string;
  printCount: number;
}

interface HistoryDashboardProps {
  profile: PrinterProfile;
  onStatusChange: (id: string, newStatus: string) => void;
  onReprint: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ 
  profile,
  onStatusChange,
  onReprint,
  onClearHistory 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reprintRow, setReprintRow] = useState<LedgerRecord | null>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.ledger.listPaginated,
    {},
    { initialNumItems: 50 }
  );

  const records = results.map(r => ({
    id: r._id,
    payeeName: r.payeeName,
    amount: r.amount,
    chequeDate: r.chequeDate,
    bankName: r.bankName,
    acPayee: r.acPayee,
    notes: r.notes,
    status: r.status,
    createdAt: r.createdAt,
    printCount: r.printCount
  }));

  const handleReprintClick = (row: LedgerRecord) => {
    setReprintRow(row);
  };

  const executeReprint = () => {
    if (!reprintRow) return;

    const record: ChequeRecord = {
      payeeName: reprintRow.payeeName,
      amount: reprintRow.amount,
      chequeDate: reprintRow.chequeDate,
      bankName: reprintRow.bankName,
      acPayee: reprintRow.acPayee,
      notes: reprintRow.notes
    };

    const doc = generateChequePDF(record, profile);
    doc.save(`reprint_cheque_${reprintRow.payeeName.replace(/\s+/g, "_")}_${reprintRow.chequeDate}.pdf`);

    // Update status to printed and increment print count via Convex
    onStatusChange(reprintRow.id, "printed");
    onReprint(reprintRow.id);

    // Close warning modal
    setReprintRow(null);
  };

  // Filters application
  const filteredRecords = records.filter((rec) => {
    // Payee search filter
    const matchesSearch = rec.payeeName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date filters
    let matchesStartDate = true;
    let matchesEndDate = true;
    
    if (startDate) {
      matchesStartDate = new Date(rec.chequeDate) >= new Date(startDate);
    }
    if (endDate) {
      matchesEndDate = new Date(rec.chequeDate) <= new Date(endDate);
    }
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  // Calculate quick stats
  const totalPrintedCount = records.filter(r => r.status === "printed").length;
  const totalSpoiledCount = records.filter(r => r.status === "spoiled").length;
  const totalDraftCount = records.filter(r => r.status === "draft").length;
  
  const totalValidValue = records
    .filter(r => r.status === "printed" || r.status === "draft")
    .reduce((sum, r) => sum + r.amount, 0);

  // CSV Export utility
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    
    const headers = ["ID", "Payee Name", "Amount (INR)", "Cheque Date", "Bank Template", "Status", "Print Count", "Notes", "Created At"];
    const csvRows = [
      headers.join(","), // Header row
      ...filteredRecords.map(r => [
        `"${r.id}"`,
        `"${r.payeeName.replace(/"/g, '""')}"`,
        r.amount.toFixed(2),
        `"${r.chequeDate}"`,
        `"${r.bankName}"`,
        `"${r.status}"`,
        r.printCount,
        `"${(r.notes || "").replace(/"/g, '""')}"`,
        `"${r.createdAt}"`
      ].join(","))
    ];
    
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cheque_audit_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Ledger & History</h1>
        <p className="page-subtitle">Track, filter, and modify print statuses for corporate accounting and reconciliation.</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid-container" style={{ marginBottom: "2rem" }}>
        <div className="card" style={{ gridColumn: "span 3", display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ backgroundColor: "var(--primary-glow)", padding: "0.75rem", borderRadius: "10px", color: "var(--primary)" }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total Valid Value</p>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 700 }}>
              ₹{totalValidValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 3", display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ backgroundColor: "rgba(16,185,129,0.1)", padding: "0.75rem", borderRadius: "10px", color: "var(--success)" }}>
            <RefreshCw size={24} />
          </div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Printed Cheques</p>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 700 }}>{totalPrintedCount}</h3>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 3", display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ backgroundColor: "rgba(239,68,68,0.1)", padding: "0.75rem", borderRadius: "10px", color: "var(--error)" }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Spoiled / Jammed</p>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 700 }}>{totalSpoiledCount}</h3>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 3", display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ backgroundColor: "rgba(59,130,246,0.1)", padding: "0.75rem", borderRadius: "10px", color: "var(--info)" }}>
            <Calendar size={24} />
          </div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Draft Cheques</p>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 700 }}>{totalDraftCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Ledger Card */}
      <div className="card">
        {/* Filters bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", flexGrow: 1, maxWidth: "800px" }}>
            {/* Payee Search */}
            <div style={{ position: "relative", flexGrow: 1, minWidth: "220px" }}>
              <Search 
                size={16} 
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} 
              />
              <input
                type="text"
                className="input-field"
                placeholder="Search by Payee Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "2.25rem", width: "100%" }}
              />
            </div>

            {/* Date Range Start */}
            <div style={{ position: "relative", width: "180px" }}>
              <input
                type="date"
                className="input-field"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: "100%" }}
                title="Start Date filter"
              />
            </div>

            {/* Date Range End */}
            <div style={{ position: "relative", width: "180px" }}>
              <input
                type="date"
                className="input-field"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: "100%" }}
                title="End Date filter"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button 
              className="btn btn-secondary" 
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
            >
              <FileSpreadsheet size={16} />
              Export CSV
            </button>

            {records.length > 0 && (
              <button 
                className="btn btn-secondary" 
                onClick={onClearHistory}
                style={{ color: "var(--error)", borderColor: "rgba(239,68,68,0.2)" }}
              >
                Clear All Logs
              </button>
            )}
          </div>
        </div>

        {/* Ledger Grid Table */}
        {filteredRecords.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "260px", color: "var(--text-muted)" }}>
            <AlertCircle size={40} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
            <p>No transactions found matching active search criteria.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Payee Name</th>
                  <th>Amount (₹)</th>
                  <th>Bank Template</th>
                  <th>Status</th>
                  <th>Prints</th>
                  <th>Notes</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.chequeDate}</td>
                    <td style={{ fontWeight: 500 }}>{row.payeeName}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.95rem" }}>
                      ₹{row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{row.bankName}</td>
                    <td>
                      <select
                        className="input-field"
                        value={row.status}
                        onChange={(e) => onStatusChange(row.id, e.target.value)}
                        style={{ 
                          padding: "0.25rem 0.5rem", 
                          fontSize: "0.75rem", 
                          fontWeight: 600,
                          backgroundColor: row.status === "printed" ? "rgba(16,185,129,0.1)" :
                                           row.status === "spoiled" ? "rgba(239,68,68,0.1)" :
                                           row.status === "draft" ? "rgba(59,130,246,0.1)" : "rgba(107,114,128,0.1)",
                          color: row.status === "printed" ? "var(--success)" :
                                 row.status === "spoiled" ? "var(--error)" :
                                 row.status === "draft" ? "var(--info)" : "var(--text-secondary)",
                          borderColor: "transparent",
                          cursor: "pointer"
                        }}
                      >
                        <option value="printed" style={{ backgroundColor: "#fff", color: "var(--success)" }}>Printed</option>
                        <option value="spoiled" style={{ backgroundColor: "#fff", color: "var(--error)" }}>Spoiled / Jammed</option>
                        <option value="draft" style={{ backgroundColor: "#fff", color: "var(--info)" }}>Draft</option>
                        <option value="cancelled" style={{ backgroundColor: "#fff", color: "var(--text-secondary)" }}>Cancelled</option>
                      </select>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600, fontSize: "0.85rem" }}>
                      {row.printCount}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      {row.notes || <span style={{ color: "var(--text-muted)" }}>-</span>}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (
                      {new Date(row.createdAt).toLocaleDateString()}
                      )
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleReprintClick(row)}
                        style={{ 
                          padding: "0.25rem 0.5rem", 
                          fontSize: "0.72rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem"
                        }}
                      >
                        <Printer size={11} />
                        Reprint
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {status === "CanLoadMore" && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => loadMore(50)}
            >
              Load More Records
            </button>
          </div>
        )}
      </div>

      {/* Reprint Warning Dialog */}
      {reprintRow && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", padding: "0.5rem", borderRadius: "50%" }}>
                <AlertTriangle color="var(--error)" size={24} />
              </div>
              <div>
                <h3 className="modal-title">Reprint Verification</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Important printer verification before downloading.
                </p>
              </div>
            </div>

            <div style={{ margin: "1.5rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ backgroundColor: "#f0f4fa", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(30, 58, 95, 0.15)" }}>
                <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  Reprinting cheque for: {reprintRow.payeeName}
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  Amount: ₹{reprintRow.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  {reprintRow.printCount > 1 && (
                    <span style={{ marginLeft: "0.75rem", color: "var(--warning)" }}>
                      (Previously printed {reprintRow.printCount} time{reprintRow.printCount !== 1 ? "s" : ""})
                    </span>
                  )}
                </p>
                <ol style={{ paddingLeft: "1.25rem", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <li>Open the PDF in <strong>Adobe Reader</strong>.</li>
                  <li>Ensure <strong>'Page Sizing'</strong> is set to <strong>Actual Size</strong>.</li>
                  <li>Disable <strong>'Choose paper source by PDF page size'</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setReprintRow(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={executeReprint}
              >
                <Printer size={16} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
