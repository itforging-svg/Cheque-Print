import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Layout } from "./components/Layout";
import { ChequeWriter } from "./components/ChequeWriter";
import { BulkPrinter } from "./components/BulkPrinter";
import { CalibrationWizard } from "./components/CalibrationWizard";
import { HistoryDashboard } from "./components/HistoryDashboard";
import type { PrinterProfile } from "./utils/pdfGenerator";

const DEFAULT_PROFILE: PrinterProfile = {
  feedOrientation: "portrait",
  feedAlignment: "center",
  offsetX: 0,
  offsetY: 0
};

function App() {
  const [activeTab, setActiveTab] = useState("writer");
  
  // Convex queries
  const savedProfile = useQuery(api.profiles.getDefault);

  // Convex mutations
  const insertRecord = useMutation(api.ledger.insert);
  const insertBatchRecords = useMutation(api.ledger.insertBatch);
  const updateRecordStatus = useMutation(api.ledger.updateStatus);
  const incrementPrintCount = useMutation(api.ledger.incrementPrintCount);
  const clearAllRecords = useMutation(api.ledger.clearAll);
  const upsertProfile = useMutation(api.profiles.upsertDefault);

  // Derive the active profile from Convex or fall back to default
  const profile: PrinterProfile = savedProfile
    ? {
        feedOrientation: savedProfile.feedOrientation as "portrait" | "landscape",
        feedAlignment: savedProfile.feedAlignment as "center" | "left" | "right",
        offsetX: savedProfile.offsetX,
        offsetY: savedProfile.offsetY,
      }
    : DEFAULT_PROFILE;

  // Operations
  const handleRecordAdded = async (record: {
    payeeName: string;
    amount: number;
    chequeDate: string;
    bankName: string;
    acPayee: boolean;
    notes?: string;
    status: string;
  }) => {
    try {
      await insertRecord({
        payeeName: record.payeeName,
        amount: record.amount,
        chequeDate: record.chequeDate,
        bankName: record.bankName,
        acPayee: record.acPayee,
        notes: record.notes,
        status: record.status,
      });
    } catch (error) {
      console.error("Failed to insert record:", error);
      alert("Error: Failed to save cheque record to database.");
    }
  };

  const handleRecordsAdded = async (newRecords: {
    payeeName: string;
    amount: number;
    chequeDate: string;
    bankName: string;
    acPayee: boolean;
    notes?: string;
    status: string;
  }[]) => {
    try {
      await insertBatchRecords({
        records: newRecords.map(r => ({
          payeeName: r.payeeName,
          amount: r.amount,
          chequeDate: r.chequeDate,
          bankName: r.bankName,
          acPayee: r.acPayee,
          notes: r.notes,
          status: r.status,
        })),
      });
    } catch (error) {
      console.error("Failed to insert batch records:", error);
      alert("Error: Failed to save bulk cheque records to database.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateRecordStatus({
        id: id as Id<"cheque_ledger">,
        newStatus,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Error: Failed to update cheque status.");
    }
  };

  const handleReprint = async (id: string) => {
    try {
      await incrementPrintCount({
        id: id as Id<"cheque_ledger">,
      });
    } catch (error) {
      console.error("Failed to increment print count:", error);
      alert("Error: Failed to register reprint.");
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear all transaction records? This action is irreversible.")) {
      try {
        await clearAllRecords();
      } catch (error) {
        console.error("Failed to clear history:", error);
        alert("Error: Failed to clear history.");
      }
    }
  };

  const handleProfileChange = async (newProfile: PrinterProfile) => {
    try {
      await upsertProfile({
        feedOrientation: newProfile.feedOrientation,
        feedAlignment: newProfile.feedAlignment,
        offsetX: newProfile.offsetX,
        offsetY: newProfile.offsetY,
      });
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("Error: Failed to save printer profile.");
    }
  };


  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "writer" && (
        <ChequeWriter 
          profile={profile} 
          onRecordAdded={handleRecordAdded} 
        />
      )}
      
      {activeTab === "bulk" && (
        <BulkPrinter 
          profile={profile} 
          onRecordsAdded={handleRecordsAdded} 
        />
      )}

      {activeTab === "calibration" && (
        <CalibrationWizard 
          profile={profile} 
          onProfileChange={handleProfileChange} 
        />
      )}

      {activeTab === "history" && (
        <HistoryDashboard 
          profile={profile}
          onStatusChange={handleStatusChange}
          onReprint={handleReprint}
          onClearHistory={handleClearHistory} 
        />
      )}
    </Layout>
  );
}

export default App;
