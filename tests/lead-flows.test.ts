import { describe, expect, it } from "vitest";
import { makeWorld } from "./helpers";

// End-to-end flows through the LeadService (same code the API calls), proving
// both the happy paths and the permission boundaries.

describe("Flow 1: public capture → admin assigns → member works the lead", () => {
  it("captures an unassigned NEW lead and logs a LEAD_CREATED activity", async () => {
    const { services, admin } = await makeWorld();
    const lead = await services.leads.capture({
      name: "Priya Sharma",
      email: "priya@acme.io",
      source: "website",
    });

    expect(lead.status).toBe("NEW");
    expect(lead.assignedToId).toBeNull();

    const detail = await services.leads.getDetail(admin, lead.id);
    expect(detail.activities).toHaveLength(1);
    expect(detail.activities[0].type).toBe("LEAD_CREATED");
    expect(detail.activities[0].actorId).toBeNull();
  });

  it("lets an admin assign, then the assignee can advance status + note", async () => {
    const { services, admin, mia } = await makeWorld();
    const lead = await services.leads.capture({
      name: "David Chen",
      email: "david@nw.co",
    });

    await services.leads.assign(admin, lead.id, mia.id);
    const advanced = await services.leads.changeStatus(mia, lead.id, "CONTACTED");
    expect(advanced.status).toBe("CONTACTED");

    await services.leads.addNote(mia, lead.id, "Left a voicemail.");

    const detail = await services.leads.getDetail(mia, lead.id);
    expect(detail.notes).toHaveLength(1);
    expect(detail.notes[0].body).toBe("Left a voicemail.");
    // Newest-first: NOTE_ADDED, STATUS_CHANGED, ASSIGNED, LEAD_CREATED
    expect(detail.activities.map((a) => a.type)).toEqual([
      "NOTE_ADDED",
      "STATUS_CHANGED",
      "ASSIGNED",
      "LEAD_CREATED",
    ]);
  });
});

describe("Flow 2: permission enforcement in the service layer", () => {
  it("forbids a member from changing status on a lead they don't own", async () => {
    const { services, admin, mia, rob } = await makeWorld();
    const lead = await services.leads.capture({ name: "X", email: "x@y.io" });
    await services.leads.assign(admin, lead.id, mia.id); // owned by Mia

    await expect(
      services.leads.changeStatus(rob, lead.id, "WON"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      services.leads.addNote(rob, lead.id, "sneaky"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("forbids a member from assigning leads (admin-only)", async () => {
    const { services, mia, rob } = await makeWorld();
    const lead = await services.leads.capture({ name: "Y", email: "y@y.io" });
    await expect(
      services.leads.assign(mia, lead.id, rob.id),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("404s on a missing lead", async () => {
    const { services, admin } = await makeWorld();
    await expect(
      services.leads.getDetail(admin, "lead_does_not_exist"),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("Flow 3: list pagination + filtering", () => {
  it("paginates newest-first and filters by status and assignee", async () => {
    const { services, admin, mia } = await makeWorld();

    for (let i = 0; i < 15; i++) {
      await services.leads.capture({ name: `Lead ${i}`, email: `l${i}@x.io` });
    }
    const all = await services.leads.list(admin, { page: 1, pageSize: 10 });
    expect(all.total).toBe(15);
    expect(all.items).toHaveLength(10);
    // Newest first: the last captured lead leads the page.
    expect(all.items[0].name).toBe("Lead 14");

    const page2 = await services.leads.list(admin, { page: 2, pageSize: 10 });
    expect(page2.items).toHaveLength(5);

    // Assign one to Mia and move it, then filter.
    const target = all.items[0];
    await services.leads.assign(admin, target.id, mia.id);
    await services.leads.changeStatus(mia, target.id, "QUALIFIED");

    const mine = await services.leads.list(mia, {
      page: 1,
      pageSize: 10,
      assignedToId: mia.id,
    });
    expect(mine.total).toBe(1);
    expect(mine.items[0].id).toBe(target.id);

    const qualified = await services.leads.list(admin, {
      page: 1,
      pageSize: 10,
      status: "QUALIFIED",
    });
    expect(qualified.total).toBe(1);

    const unassigned = await services.leads.list(admin, {
      page: 1,
      pageSize: 50,
      assignedToId: null,
    });
    expect(unassigned.total).toBe(14);
  });
});
