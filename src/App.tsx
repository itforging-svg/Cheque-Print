import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
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
  const records = useQuery(api.ledger.list) ?? [];
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
    await insertRecord({
      payeeName: record.payeeName,
      amount: record.amount,
      chequeDate: record.chequeDate,
      bankName: record.bankName,
      acPayee: record.acPayee,
      notes: record.notes,
      status: record.status,
    });
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
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateRecordStatus({
      id: id as any, // Convex Id type
      newStatus,
    });
  };

  const handleReprint = async (id: string) => {
    await incrementPrintCount({
      id: id as any,
    });
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear all transaction records? This action is irreversible.")) {
      await clearAllRecords();
    }
  };

  const handleProfileChange = async (newProfile: PrinterProfile) => {
    await upsertProfile({
      feedOrientation: newProfile.feedOrientation,
      feedAlignment: newProfile.feedAlignment,
      offsetX: newProfile.offsetX,
      offsetY: newProfile.offsetY,
    });
  };

  // Map Convex records to the component format
  const mappedRecords = records.map((r) => ({
    id: r._id,
    payeeName: r.payeeName,
    amount: r.amount,
    chequeDate: r.chequeDate,
    bankName: r.bankName,
    acPayee: r.acPayee,
    notes: r.notes,
    status: r.status,
    createdAt: r.createdAt,
    printCount: r.printCount,
  }));

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
          records={mappedRecords} 
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
