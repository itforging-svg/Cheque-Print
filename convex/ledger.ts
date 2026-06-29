import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Insert a single cheque record
export const insert = mutation({
  args: {
    payeeName: v.string(),
    amount: v.number(),
    chequeDate: v.string(),
    bankName: v.string(),
    acPayee: v.boolean(),
    notes: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("cheque_ledger", {
      ...args,
      createdAt: new Date().toISOString(),
      printCount: 1,
    });
    return id;
  },
});

// Insert multiple cheque records (bulk CSV upload)
export const insertBatch = mutation({
  args: {
    records: v.array(
      v.object({
        payeeName: v.string(),
        amount: v.number(),
        chequeDate: v.string(),
        bankName: v.string(),
        acPayee: v.boolean(),
        notes: v.optional(v.string()),
        status: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const record of args.records) {
      const id = await ctx.db.insert("cheque_ledger", {
        ...record,
        createdAt: new Date().toISOString(),
        printCount: 1,
      });
      ids.push(id);
    }
    return ids;
  },
});

// Update the status of a cheque record
export const updateStatus = mutation({
  args: {
    id: v.id("cheque_ledger"),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.newStatus });
  },
});

// Increment the print count (for reprints)
export const incrementPrintCount = mutation({
  args: {
    id: v.id("cheque_ledger"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (record) {
      await ctx.db.patch(args.id, { printCount: record.printCount + 1 });
    }
  },
});

// Clear all ledger records
export const clearAll = mutation({
  handler: async (ctx) => {
    const records = await ctx.db.query("cheque_ledger").collect();
    for (const record of records) {
      await ctx.db.delete(record._id);
    }
  },
});

// List all records, newest first
export const list = query({
  handler: async (ctx) => {
    const records = await ctx.db
      .query("cheque_ledger")
      .order("desc")
      .collect();
    return records;
  },
});
