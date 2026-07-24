import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaStore } from "@/lib/store/prisma-store";
import { buildServices } from "@/lib/services";

// Optional DB-parity check. It runs ONLY when TEST_DATABASE_URL points at a
// migrated Postgres (e.g. a throwaway Neon branch); otherwise it is skipped so
// the default `npm test` stays offline and deterministic. Enable with:
//   TEST_DATABASE_URL="postgres://..." npm test
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("PrismaStore against real Postgres", () => {
  let db: PrismaClient;

  beforeAll(async () => {
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    await db.activity.deleteMany();
    await db.note.deleteMany();
    await db.lead.deleteMany();
    await db.user.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("captures, assigns, filters and paginates via SQL", async () => {
    const store = new PrismaStore(db);
    const { auth, leads } = buildServices(store);

    const admin = await store.createUser({
      email: "admin@int.test",
      name: "Admin",
      role: "ADMIN",
      passwordHash: await auth.hashPassword("Password123!"),
    });
    const mia = await store.createUser({
      email: "mia@int.test",
      name: "Mia",
      role: "MEMBER",
      passwordHash: await auth.hashPassword("Password123!"),
    });
    const pub = { ...admin, password: undefined } as never;
    const miaPub = { ...mia, password: undefined } as never;

    for (let i = 0; i < 3; i++) {
      await leads.capture({ name: `Acme ${i}`, email: `a${i}@acme.io` });
    }
    const page = await leads.list(pub, { page: 1, pageSize: 2 });
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(2);

    // case-insensitive search hits the Postgres `insensitive` path
    const found = await leads.list(pub, {
      page: 1,
      pageSize: 10,
      search: "acme",
    });
    expect(found.total).toBe(3);

    await leads.assign(pub, page.items[0].id, mia.id);
    const mine = await leads.list(miaPub, {
      page: 1,
      pageSize: 10,
      assignedToId: mia.id,
    });
    expect(mine.total).toBe(1);
  });
});
