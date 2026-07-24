import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/domain/errors";
import { makeWorld } from "./helpers";

describe("AuthService.verifyCredentials", () => {
  it("accepts correct credentials and never returns the password hash", async () => {
    const { services } = await makeWorld();
    const user = await services.auth.verifyCredentials(
      "admin@test.dev",
      "Password123!",
    );
    expect(user.role).toBe("ADMIN");
    expect(user.email).toBe("admin@test.dev");
    expect((user as Record<string, unknown>).password).toBeUndefined();
  });

  it("rejects a wrong password with 401", async () => {
    const { services } = await makeWorld();
    await expect(
      services.auth.verifyCredentials("admin@test.dev", "wrong"),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rejects an unknown email with the SAME error (no account enumeration)", async () => {
    const { services } = await makeWorld();
    let unknownErr: unknown;
    let wrongErr: unknown;
    try {
      await services.auth.verifyCredentials("nobody@test.dev", "whatever");
    } catch (e) {
      unknownErr = e;
    }
    try {
      await services.auth.verifyCredentials("admin@test.dev", "wrong");
    } catch (e) {
      wrongErr = e;
    }
    expect(unknownErr).toBeInstanceOf(AppError);
    expect(wrongErr).toBeInstanceOf(AppError);
    expect((unknownErr as AppError).message).toBe(
      (wrongErr as AppError).message,
    );
  });
});
