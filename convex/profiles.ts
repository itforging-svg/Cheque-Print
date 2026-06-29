import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create or update the default printer profile
export const upsertDefault = mutation({
  args: {
    profileName: v.optional(v.string()),
    feedOrientation: v.string(),
    feedAlignment: v.string(),
    offsetX: v.number(),
    offsetY: v.number(),
  },
  handler: async (ctx, args) => {
    // Find existing default profile
    const existing = await ctx.db
      .query("printer_profiles")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    if (existing) {
      // Update existing default profile
      await ctx.db.patch(existing._id, {
        profileName: args.profileName ?? existing.profileName,
        feedOrientation: args.feedOrientation,
        feedAlignment: args.feedAlignment,
        offsetX: args.offsetX,
        offsetY: args.offsetY,
      });
      return existing._id;
    } else {
      // Create new default profile
      const id = await ctx.db.insert("printer_profiles", {
        profileName: args.profileName ?? "Default Profile",
        feedOrientation: args.feedOrientation,
        feedAlignment: args.feedAlignment,
        offsetX: args.offsetX,
        offsetY: args.offsetY,
        isDefault: true,
      });
      return id;
    }
  },
});

// Get the default printer profile
export const getDefault = query({
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("printer_profiles")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();
    return profile;
  },
});
