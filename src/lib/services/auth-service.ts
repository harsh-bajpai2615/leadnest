import bcrypt from "bcryptjs";
import { AppError } from "@/lib/domain/errors";
import { toPublicUser, type User } from "@/lib/domain/types";
import type { Store } from "@/lib/store/store";

const BCRYPT_ROUNDS = 10;

export class AuthService {
  constructor(private readonly store: Store) {}

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  /**
   * Verify email + password. Returns the public user on success.
   * Always throws the SAME error whether the email is unknown or the password
   * is wrong, so the endpoint cannot be used to enumerate accounts.
   */
  async verifyCredentials(email: string, password: string): Promise<User> {
    const user = await this.store.findUserByEmail(email);
    const invalid = new AppError("UNAUTHENTICATED", "Invalid email or password");

    if (!user) {
      // Spend a hash cycle anyway to avoid a timing signal on unknown emails.
      await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinva");
      throw invalid;
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw invalid;

    return toPublicUser(user);
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await this.store.findUserById(id);
    return user ? toPublicUser(user) : null;
  }
}
