import "dotenv/config";
import { buildServices } from "@/lib/services";
import { PrismaStore } from "@/lib/store/prisma-store";
import { prisma } from "@/lib/prisma";

// Seed the demo accounts + a realistic pipeline so the deployed app is
// immediately explorable. Credentials are printed at the end and documented in
// the README. Idempotent: re-running clears leads/notes/activities and re-seeds.

async function main() {
  const store = new PrismaStore();
  const { auth } = buildServices(store);

  // Reset transactional data (keep it simple + repeatable for a demo).
  await prisma.activity.deleteMany();
  await prisma.note.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  const password = await auth.hashPassword("Password123!");

  const admin = await store.createUser({
    email: "admin@leadnest.test",
    name: "Ava Admin",
    role: "ADMIN",
    passwordHash: password,
  });
  const mia = await store.createUser({
    email: "mia@leadnest.test",
    name: "Mia Member",
    role: "MEMBER",
    passwordHash: password,
  });
  const rob = await store.createUser({
    email: "rob@leadnest.test",
    name: "Rob Member",
    role: "MEMBER",
    passwordHash: password,
  });

  const { leads } = buildServices(store);

  // A spread of leads across the pipeline.
  const samples = [
    { name: "Priya Sharma", email: "priya@acme.io", company: "Acme Robotics", source: "website", message: "Need a demo for our ops team." },
    { name: "David Chen", email: "david@northwind.co", company: "Northwind", source: "referral", message: "Referred by a partner." },
    { name: "Sara Ali", email: "sara@brightlabs.dev", company: "Bright Labs", source: "website", message: "Pricing for 50 seats?" },
    { name: "Tom Baker", email: "tom@fjord.design", company: "Fjord", source: "event", message: "Met at SaaSConf." },
    { name: "Lena Roy", email: "lena@vertex.ai", company: "Vertex", source: "website", message: null },
  ];

  const created = [];
  for (const s of samples) {
    created.push(await leads.capture(s));
  }

  // Move a few along the pipeline as the admin, and assign work.
  await leads.assign(admin, created[0].id, mia.id);
  await leads.changeStatus(mia, created[0].id, "CONTACTED");
  await leads.addNote(mia, created[0].id, "Left a voicemail, will follow up Tuesday.");

  await leads.assign(admin, created[1].id, rob.id);
  await leads.changeStatus(rob, created[1].id, "QUALIFIED");
  await leads.addNote(rob, created[1].id, "Budget confirmed, sending proposal.");
  await leads.changeStatus(rob, created[1].id, "PROPOSAL");

  await leads.assign(admin, created[2].id, mia.id);

  console.log("\nSeed complete. Demo accounts (password: Password123!):");
  console.log("  ADMIN   admin@leadnest.test");
  console.log("  MEMBER  mia@leadnest.test");
  console.log("  MEMBER  rob@leadnest.test\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
