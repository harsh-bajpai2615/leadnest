import { describe, expect, it } from "vitest";
import {
  canAddNote,
  canAssignLead,
  canChangeStatus,
  canViewUsers,
  isAdmin,
  ownsLead,
} from "@/lib/domain/permissions";
import type { User } from "@/lib/domain/types";

const admin: User = {
  id: "u_admin",
  email: "a@x.dev",
  name: "Admin",
  role: "ADMIN",
  createdAt: new Date(),
};
const member: User = {
  id: "u_member",
  email: "m@x.dev",
  name: "Member",
  role: "MEMBER",
  createdAt: new Date(),
};

describe("authorization policy", () => {
  it("identifies admins", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(member)).toBe(false);
  });

  it("treats admins as owners of every lead", () => {
    expect(ownsLead(admin, { assignedToId: null })).toBe(true);
    expect(ownsLead(admin, { assignedToId: "someone_else" })).toBe(true);
  });

  it("treats a member as owner only of leads assigned to them", () => {
    expect(ownsLead(member, { assignedToId: "u_member" })).toBe(true);
    expect(ownsLead(member, { assignedToId: "u_other" })).toBe(false);
    expect(ownsLead(member, { assignedToId: null })).toBe(false);
  });

  it("lets only the owner/admin change status or add notes", () => {
    const mine = { assignedToId: "u_member" };
    const theirs = { assignedToId: "u_other" };
    expect(canChangeStatus(member, mine)).toBe(true);
    expect(canChangeStatus(member, theirs)).toBe(false);
    expect(canAddNote(member, mine)).toBe(true);
    expect(canAddNote(member, theirs)).toBe(false);
    expect(canChangeStatus(admin, theirs)).toBe(true);
    expect(canAddNote(admin, theirs)).toBe(true);
  });

  it("restricts assignment and the user directory to admins", () => {
    expect(canAssignLead(admin)).toBe(true);
    expect(canAssignLead(member)).toBe(false);
    expect(canViewUsers(admin)).toBe(true);
    expect(canViewUsers(member)).toBe(false);
  });
});
