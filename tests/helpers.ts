import { buildServices, type Services } from "@/lib/services";
import { MemoryStore } from "@/lib/store/memory-store";
import type { User } from "@/lib/domain/types";

// Spin up a fresh service graph backed by an in-memory store, pre-seeded with
// one admin and two members. Each test gets its own isolated world.
export interface TestWorld {
  services: Services;
  store: MemoryStore;
  admin: User;
  mia: User; // member
  rob: User; // member
}

export async function makeWorld(): Promise<TestWorld> {
  const store = new MemoryStore();
  const services = buildServices(store);
  const hash = await services.auth.hashPassword("Password123!");

  const admin = await store.createUser({
    email: "admin@test.dev",
    name: "Ava Admin",
    role: "ADMIN",
    passwordHash: hash,
  });
  const mia = await store.createUser({
    email: "mia@test.dev",
    name: "Mia Member",
    role: "MEMBER",
    passwordHash: hash,
  });
  const rob = await store.createUser({
    email: "rob@test.dev",
    name: "Rob Member",
    role: "MEMBER",
    passwordHash: hash,
  });

  const pub = (u: { id: string; email: string; name: string; role: "ADMIN" | "MEMBER"; createdAt: Date }): User => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
  });

  return { services, store, admin: pub(admin), mia: pub(mia), rob: pub(rob) };
}
