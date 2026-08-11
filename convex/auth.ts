import { Email } from "@convex-dev/auth/providers/Email";
import { EmailConfig, convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { DataModel, Id } from "./_generated/dataModel";
import { ActionCtx, MutationCtx } from "./_generated/server";

// §3.1 / §5.1 — email OTP only, no password.
//
// Delivery uses Resend when RESEND_API_KEY is configured. Without it the code is
// written to `otpDeliveries` and logged, so a fresh deployment is usable before
// an email provider exists.

const OTP_TTL_SECONDS = 10 * 60;

function generateOtp(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, "0");
}

// Auth.js types `sendVerificationRequest` as single-argument; Convex Auth calls
// it with an action ctx as the second argument.
type SendVerificationRequest = EmailConfig["sendVerificationRequest"];

const sendOtpEmail = (async (
  { identifier: email, token }: { identifier: string; token: string },
  ctx: ActionCtx,
) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OTP_EMAIL_FROM ?? "AYO <onboarding@resend.dev>";
  let delivered = false;

  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `${token} — kode masuk AYO`,
        text: `Kode masuk AYO: ${token}\nBerlaku 10 menit.`,
        html: otpEmailHtml(token),
      }),
    });
    delivered = res.ok;
    if (!res.ok) {
      console.error("Resend gagal", res.status, await res.text());
    }
  } else {
    console.warn(`[AYO] OTP untuk ${email}: ${token} (RESEND_API_KEY belum diset)`);
  }

  await ctx.runMutation(internal.otp.record, { email, code: token, delivered });
}) as unknown as SendVerificationRequest;

const EmailOtp = Email<DataModel>({
  id: "email-otp",
  maxAge: OTP_TTL_SECONDS,
  async generateVerificationToken() {
    return generateOtp();
  },
  sendVerificationRequest: sendOtpEmail,
});

function otpEmailHtml(token: string): string {
  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px">
  <p style="color:#6b7280;font-size:14px;margin:0 0 24px">Kode masuk AYO</p>
  <p style="font-size:34px;letter-spacing:.32em;font-weight:600;margin:0 0 24px">${token}</p>
  <p style="color:#6b7280;font-size:13px;margin:0">Berlaku 10 menit. Abaikan email ini jika bukan Anda.</p>
</div>`;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [EmailOtp],
  session: { totalDurationMs: 30 * 24 * 60 * 60 * 1000 },
  callbacks: {
    // Sign-in never creates an account. An AYO user row must already exist —
    // created by public registration, an L2 invite, or an admin (§3.2).
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId) return existingUserId;
      const email = String(profile.email ?? "").trim().toLowerCase();
      // The callback ctx is generic; the database is ours.
      const db = ctx.db as unknown as MutationCtx["db"];
      const user = await db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .unique();
      if (!user) {
        throw new ConvexError({
          code: "EMAIL_NOT_REGISTERED",
          message: "Email belum terdaftar.",
        });
      }
      if (!user.emailVerificationTime) {
        await db.patch("users", user._id, { emailVerificationTime: Date.now() });
      }
      return user._id as Id<"users">;
    },
  },
});
