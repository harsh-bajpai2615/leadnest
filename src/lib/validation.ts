import { z } from "zod";
import { LEAD_STATUSES } from "@/lib/domain/types";

// Request validation lives in one place. Route handlers parse with these and
// let AppError("VALIDATION") map to 422 — they never trust raw input.

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const captureLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("A valid email is required").max(200),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  source: z.string().trim().max(60).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateLeadSchema = z
  .object({
    status: z.enum(LEAD_STATUSES as [string, ...string[]]).optional(),
    // string id to assign, or null to unassign
    assignedToId: z.string().min(1).nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.assignedToId !== undefined, {
    message: "Provide at least one of: status, assignedToId",
  });

export const addNoteSchema = z.object({
  body: z.string().trim().min(1, "Note cannot be empty").max(2000),
});

export const listLeadsQuerySchema = z.object({
  status: z.enum(LEAD_STATUSES as [string, ...string[]]).optional(),
  assignedToId: z.string().optional(), // "me", "unassigned", or a user id
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
