import React, { useState, useRef } from "react";
import { Upload, Info, FileSpreadsheet, Download, Trash2, AlertTriangle } from "lucide-react";
import { generateBulkChequesPDF } from "../utils/pdfGenerator";
import type { ChequeRecord, PrinterProfile } from "../utils/pdfGenerator";

interface ParsedCheque extends ChequeRecord {
  isValid: boolean;
  validationError?: string;
}

interface BulkPrinterProps {
  profile: PrinterProfile;
  onRecordsAdded: (records: {
    payeeName: string;
    amount: number;
    chequeDate: string;
    bankName: string;
    acPayee: boolean;
    notes?: string;
    status: string;
  }[]) => void;
}

export const BulkPrinter: React.FC<BulkPrinterProps> = ({ profile, onRecordsAdded }) => {
  const [parsedRows, setParsedRows] = useState<ParsedCheque[]>([]);
  const [fileName, setFileName] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Sample CSV Helper
  const downloadSampleCSV = () => {
    const csvContent = 
      "Payee,Amount,Date,Notes\n" +
      "Reliance Industries Ltd,150000.00,2026-07-15,Raw Material Purchase\n" +
      "TCS Ltd,75420.50,2026-07-20,Consultancy Fees\n" +
      "HDFC Credit Card A/C,34200.00,2026-07-25,Credit Card Payment\n" +
      "Chandan Steel Ltd,500000.00,2026-08-01,Supplier Advance";
      
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "cheque_bulk_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom CSV parser (handles commas and optional quotes)
  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) return; // Only header or empty
      
      // Parse header to find column indices
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
      
      const payeeIdx = headers.findIndex(h => h.includes("payee") || h.includes("name"));
      const amountIdx = headers.findIndex(h => h.includes("amount") || h.includes("value") || h.includes("sum"));
      const dateIdx = headers.findIndex(h => h.includes("date"));
      const notesIdx = headers.findIndex(h => h.includes("notes") || h.includes("memo") || h.includes("purpose"));

      const rows: ParsedCheque[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip blank lines
        
        const cols = parseCSVLine(line);
        
        // Extract fields
        const payeeName = payeeIdx !== -1 && cols[payeeIdx] ? cols[payeeIdx] : "";
        const amountStr = amountIdx !== -1 && cols[amountIdx] ? cols[amountIdx] : "";
        const chequeDate = dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : "";
        const notes = notesIdx !== -1 && cols[notesIdx] ? cols[notesIdx] : "";
        
        // Validate fields
        const amount = parseFloat(amountStr);
        let isValid = true;
        let validationError = "";

        if (!payeeName) {
          isValid = false;
          validationError = "Missing payee name.";
        } else if (isNaN(amount) || amount <= 0) {
          isValid = false;
          validationError = "Invalid positive numeric amount.";
        } else if (!chequeDate || isNaN(Date.parse(chequeDate))) {
          isValid = false;
          validationError = "Invalid date format (use YYYY-MM-DD).";
        }

        rows.push({
          payeeName,
          amount: isNaN(amount) ? 0 : amount,
          chequeDate,
          bankName: "HDFC CTS-2010",
          acPayee: true,
          notes,
          isValid,
          validationError
        });
      }

      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  const clearUpload = () => {
    setParsedRows([]);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateBulk = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    // Show warnings
    setShowWarningModal(true);
  };

  const executeBulkDownload = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    // Convert parsed rows to records
    const records: ChequeRecord[] = validRows.map(r => ({
      payeeName: r.payeeName,
      amount: r.amount,
      chequeDate: r.chequeDate,
      bankName: r.bankName,
      acPayee: r.acPayee,
      notes: r.notes
    }));

    // 1. Generate & download bulk PDF
    const doc = generateBulkChequesPDF(records, profile);
    doc.save(`bulk_cheques_${new Date().toISOString().split("T")[0]}.pdf`);

    // 2. Add all to ledger via Convex mutation
    onRecordsAdded(
      validRows.map(r => ({
        payeeName: r.payeeName,
        amount: r.amount,
        chequeDate: r.chequeDate,
        bankName: r.bankName,
        acPayee: r.acPayee,
        notes: r.notes,
        status: "printed",
      }))
    );

    // Close and reset
    setShowWarningModal(false);
    clearUpload();
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bulk Print Mode</h1>
        <p className="page-subtitle">Upload payees and amounts via CSV to print multiple cheques in continuous feeds.</p>
      </div>

      <div className="grid-container">
        {/* CSV Dropzone / Control Card */}
        <div className="card" style={{ gridColumn: "span 4" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Upload CSV Sheet</h2>
          
          <div 
            className="file-dropzone" 
            onClick={() => fileInputRef.current?.click()}
            style={{ marginBottom: "1.5rem" }}
          >
            <Upload size={36} className="dropzone-icon" />
            <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              {fileName ? fileName : "Choose CSV File"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Click to browse local files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden-file-input"
              onChange={handleFileUpload}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button 
              className="btn btn-secondary" 
              onClick={downloadSampleCSV}
              style={{ width: "100%" }}
            >
              <FileSpreadsheet size={16} />
              Download CSV Template
            </button>

            {parsedRows.length > 0 && (
              <button 
                className="btn btn-secondary" 
                onClick={clearUpload}
                style={{ width: "100%", color: "var(--error)", borderColor: "rgba(239,68,68,0.2)" }}
              >
                <Trash2 size={16} />
                Clear Upload
              </button>
            )}

            <button 
              className="btn btn-primary" 
              onClick={handleGenerateBulk}
              style={{ width: "100%", marginTop: "0.75rem" }}
              disabled={validCount === 0}
            >
              <Download size={16} />
              Print {validCount} Cheque{validCount !== 1 ? "s" : ""}
            </button>
          </div>

          {parsedRows.length > 0 && (
            <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>File Summary</h3>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Total Rows:</span>
                <span style={{ fontWeight: 600 }}>{parsedRows.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Valid Cheques:</span>
                <span style={{ color: "var(--success)", fontWeight: 600 }}>{validCount}</span>
              </div>
              {invalidCount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Errors Detected:</span>
                  <span style={{ color: "var(--error)", fontWeight: 600 }}>{invalidCount}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Data Grid Panel */}
        <div className="card" style={{ gridColumn: "span 8" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Validation Workspace</h2>
          
          {parsedRows.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--text-muted)" }}>
              <FileSpreadsheet size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
              <p>Upload a CSV file to inspect data and validate alignment settings.</p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ maxHeight: "400px" }}>
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Payee</th>
                    <th>Amount (₹)</th>
                    <th>Date</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} style={{ opacity: row.isValid ? 1 : 0.65 }}>
                      <td>
                        {row.isValid ? (
                          <span className="badge badge-printed" style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "var(--success)" }}>Ready</span>
                        ) : (
                          <span className="badge badge-spoiled" style={{ fontSize: "0.7rem" }} title={row.validationError}>
                            Err: {row.validationError}
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 500 }}>{row.payeeName || <span style={{ color: "var(--text-muted)" }}>-</span>}</td>
                      <td>
                        {row.amount > 0 ? (
                          row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                        ) : (
                          <span style={{ color: "var(--error)" }}>Invalid</span>
                        )}
                      </td>
                      <td>{row.chequeDate || <span style={{ color: "var(--error)" }}>Missing</span>}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{row.notes || <span style={{ color: "var(--text-muted)" }}>-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="alert-box" style={{ marginTop: "1.5rem", marginBottom: 0 }}>
            <Info className="alert-icon" size={20} />
            <div className="alert-message">
              The bulk utility will aggregate valid rows into a single multi-page PDF document. Ensure your printer paper trays are 
              pre-loaded and guides are physically secured.
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Print Warning Dialog */}
      {showWarningModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", padding: "0.5rem", borderRadius: "50%" }}>
                <AlertTriangle color="var(--error)" size={24} />
              </div>
              <div>
                <h3 className="modal-title">Bulk Print Preparation</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Confirm your printing setup before downloading a multi-page PDF document.
                </p>
              </div>
            </div>

            <div style={{ margin: "1.5rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ backgroundColor: "#f0f4fa", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(30, 58, 95, 0.15)" }}>
                <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  A4 Manual Tray Check for {validCount} cheques:
                </p>
                <ul style={{ paddingLeft: "1.25rem", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <li>Ensure your printer tray is adjusted to your feed orientation: <strong>{profile.feedOrientation.toUpperCase()}</strong>.</li>
                  <li>In Adobe Reader, configure: <strong>'Actual Size'</strong> page sizing.</li>
                  <li>Disable <strong>'Choose paper source by PDF page size'</strong>.</li>
                </ul>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowWarningModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={executeBulkDownload}
              >
                <Download size={16} />
                Generate & Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
