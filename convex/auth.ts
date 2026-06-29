import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

// Phase 1 admin auth: email + password (≥16 chars enforced client-side).
// OTP / 2FA are Phase 2 additions and can be swapped in here without touching
// business logic (the auth module is intentionally isolated).
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
