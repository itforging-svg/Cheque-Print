import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Immutable audit trail of all cheques printed, reprinted, or drafted
  cheque_ledger: defineTable({
    payeeName: v.string(),
    amount: v.number(),
    chequeDate: v.string(), // YYYY-MM-DD
    bankName: v.string(),
    acPayee: v.boolean(),
    notes: v.optional(v.string()),
    status: v.string(), // "printed" | "spoiled" | "draft" | "cancelled"
    createdAt: v.string(), // ISO timestamp
    printCount: v.number(), // tracks reprints
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_status", ["status"])
    .index("by_payeeName", ["payeeName"])
    .searchIndex("search_payee", {
      searchField: "payeeName",
    }),

  // Printer calibration profiles
  printer_profiles: defineTable({
    profileName: v.string(),
    feedOrientation: v.string(), // "portrait" | "landscape"
    feedAlignment: v.string(), // "center" | "left" | "right"
    offsetX: v.number(), // in mm
    offsetY: v.number(), // in mm
    isDefault: v.boolean(),
  }),
});
