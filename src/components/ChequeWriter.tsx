import React, { useState, useEffect } from "react";
import { Info, Download, AlertTriangle, CheckCircle } from "lucide-react";
import { numberToWords } from "../utils/numberToWords";
import { generateChequePDF } from "../utils/pdfGenerator";
import type { ChequeRecord, PrinterProfile } from "../utils/pdfGenerator";

interface ChequeWriterProps {
  profile: PrinterProfile;
  onRecordAdded: (record: {
    payeeName: string;
    amount: number;
    chequeDate: string;
    bankName: string;
    acPayee: boolean;
    notes?: string;
    status: string;
  }) => void;
}

export const ChequeWriter: React.FC<ChequeWriterProps> = ({ profile, onRecordAdded }) => {
  const [payeeName, setPayeeName] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [chequeDate, setChequeDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [bankName, setBankName] = useState("HDFC CTS-2010");
  const [acPayee, setAcPayee] = useState(true);
  const [notes, setNotes] = useState("");
  const [amountWords, setAmountWords] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Auto-convert amount to words
  useEffect(() => {
    if (typeof amount === "number" && amount > 0) {
      setAmountWords(numberToWords(amount));
    } else {
      setAmountWords("");
    }
  }, [amount]);

  // Format date for the preview (DDMMYYYY)
  const getFormattedDateDigits = () => {
    const cleanDate = chequeDate.replace(/[^0-9]/g, "");
    if (cleanDate.length === 8) {
      // YYYYMMDD from input -> DDMMYYYY for cheque
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      return `${day}${month}${year}`.split("");
    }
    return Array(8).fill(" ");
  };

  const dateDigits = getFormattedDateDigits();

  const handlePrint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payeeName || !amount || amount <= 0) return;
    
    // Show the calibration instructions modal
    setShowWarningModal(true);
  };

  const executeDownload = () => {
    if (!payeeName || !amount || amount <= 0) return;
    
    const record: ChequeRecord = {
      payeeName,
      amount,
      chequeDate,
      bankName,
      acPayee,
      notes
    };

    // 1. Generate & save PDF
    const doc = generateChequePDF(record, profile);
    doc.save(`cheque_${payeeName.replace(/\s+/g, "_")}_${chequeDate}.pdf`);

    // 2. Add log entry to history via Convex mutation
    onRecordAdded({
      payeeName,
      amount,
      chequeDate,
      bankName,
      acPayee,
      notes,
      status: "printed",
    });

    // Close modal
    setShowWarningModal(false);
    
    // Clear form except template & date
    setPayeeName("");
    setAmount("");
    setNotes("");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cheque Writer</h1>
        <p className="page-subtitle">Draft and preview single cheques before generating calibrated PDFs.</p>
      </div>

      <div className="grid-container">
        {/* Form Panel */}
        <div className="card" style={{ gridColumn: "span 5" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>Cheque Details</h2>
          <form onSubmit={handlePrint}>
            <div className="form-group">
              <label htmlFor="payee">Payee Name</label>
              <input
                id="payee"
                type="text"
                className="input-field"
                placeholder="e.g. Reliance Industries Ltd."
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount (₹)</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                className="input-field"
                placeholder="e.g. 150000.00"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  setAmount(val === "" ? "" : parseFloat(val));
                }}
                required
              />
              {amountWords && (
                <p style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "0.25rem", fontStyle: "italic" }}>
                  {amountWords}
                </p>
              )}
            </div>

            <div className="grid-container" style={{ gap: "1rem", marginBottom: "1.25rem" }}>
              <div className="form-group" style={{ gridColumn: "span 6", marginBottom: 0 }}>
                <label htmlFor="chequeDate">Cheque Date</label>
                <input
                  id="chequeDate"
                  type="date"
                  className="input-field"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: "span 6", marginBottom: 0 }}>
                <label htmlFor="bankTemplate">Bank Template</label>
                <select
                  id="bankTemplate"
                  className="input-field"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                >
                  <option value="HDFC CTS-2010">HDFC CTS-2010</option>
                  <option value="SBI CTS-2010">SBI CTS-2010</option>
                  <option value="ICICI CTS-2010">ICICI CTS-2010</option>
                  <option value="Axis CTS-2010">Axis CTS-2010</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Crossing Options</label>
              <div 
                className={`toggle-container ${acPayee ? "active" : ""}`}
                onClick={() => setAcPayee(!acPayee)}
              >
                <div className="toggle-switch"></div>
                <span style={{ fontSize: "0.9rem", color: acPayee ? "#fff" : "var(--text-secondary)" }}>
                  A/C Payee Only Crossing
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes / Purpose (Optional)</label>
              <input
                id="notes"
                type="text"
                className="input-field"
                placeholder="e.g. July Vendor Payment"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "1rem" }}
              disabled={!payeeName || !amount}
            >
              <Download size={18} />
              Generate Cheque PDF
            </button>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card" style={{ flexGrow: 1 }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>Cheque Preview</h2>
            <div className="cheque-preview-container">
              <div className="cheque-mockup">
                {/* A/C Payee Crossing */}
                {acPayee && (
                  <div className="cheque-crossing">
                    <div className="cheque-crossing-text">A/C Payee</div>
                    <div className="cheque-crossing-text">Only</div>
                  </div>
                )}

                {/* Date Boxes */}
                <div className="cheque-date-box">
                  {dateDigits.map((digit, idx) => (
                    <div key={idx} className="cheque-date-digit">
                      {digit}
                    </div>
                  ))}
                </div>

                {/* Payee Line */}
                <div className="cheque-payee-line">
                  {payeeName || <span style={{ color: "#a1a1aa" }}>[Payee Name]</span>}
                </div>

                {/* Rupees in Words */}
                <div className="cheque-amount-words">
                  {amountWords || <span style={{ color: "#a1a1aa" }}>[Rupees in Words]</span>}
                </div>

                {/* Numerical Amount */}
                <div className="cheque-amount-box">
                  {amount !== "" ? (
                    amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })
                  ) : (
                    <span style={{ color: "#a1a1aa", fontWeight: "normal" }}>0.00</span>
                  )}
                </div>

              </div>
            </div>

            {/* In-view warning notice */}
            <div className="alert-box">
              <Info className="alert-icon" size={20} />
              <div className="alert-message">
                Verify date grid alignments and payee line constraints. Dynamic words convert automatically using 
                <strong> Indian numbering formats (Lakhs/Crores)</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calibration Alert Dialog Modal */}
      {showWarningModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", padding: "0.5rem", borderRadius: "50%" }}>
                <AlertTriangle color="var(--error)" size={24} />
              </div>
              <div>
                <h3 className="modal-title">Printer Instructions Required</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Important hardware setup required for HP LaserJet 1020 (or equivalent standard printers).
                </p>
              </div>
            </div>

            <div style={{ margin: "1.5rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ backgroundColor: "#f0f4fa", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(30, 58, 95, 0.15)" }}>
                <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-primary)" }}>
                  Before printing this downloaded PDF:
                </p>
                <ol style={{ paddingLeft: "1.25rem", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <li>Open the downloaded PDF in <strong>Adobe Reader</strong>.</li>
                  <li>In the print dialog, ensure <strong>'Page Sizing'</strong> is set to <strong>Actual Size</strong>.</li>
                  <li>Uncheck <strong>'Choose paper source by PDF page size'</strong>.</li>
                </ol>
              </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "#6b7280", fontSize: "0.8rem", marginTop: "0.75rem" }}>
                  <CheckCircle size={14} color="#16a34a" />
                <span>Current profile settings: {profile.feedOrientation.toUpperCase()} ({profile.feedAlignment.toUpperCase()} fed)</span>
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
                onClick={executeDownload}
              >
                <Download size={16} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
