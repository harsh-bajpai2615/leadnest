import { PrismaStore } from "@/lib/store/prisma-store";
import type { Store } from "@/lib/store/store";
import { AuthService } from "./auth-service";
import { LeadService } from "./lead-service";

export interface Services {
  store: Store;
  auth: AuthService;
  leads: LeadService;
}

// Composition root. Production wires the PrismaStore; tests build the same
// services around a MemoryStore via `buildServices`. Route handlers and server
// components call getServices() and never construct a store themselves.

export function buildServices(store: Store): Services {
  return {
    store,
    auth: new AuthService(store),
    leads: new LeadService(store),
  };
}

let cached: Services | undefined;

export function getServices(): Services {
  if (!cached) {
    cached = buildServices(new PrismaStore());
  }
  return cached;
}
