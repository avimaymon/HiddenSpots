"use server";

import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(100),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function sendResetEmail(
  email: string,
  resetUrl: string,
  locale: "he" | "en"
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Never log reset URLs outside local development (token in URL)
    if (process.env.NODE_ENV === "development") {
      console.info(`[password-reset] ${email} → ${resetUrl}`);
    }
    return { emailed: false as const, resetUrl };
  }

  const subject =
    locale === "en" ? "Reset your password — HiddenSpots" : "איפוס סיסמה — HiddenSpots";
  const html =
    locale === "en"
      ? `<p>Click to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in one hour.</p>`
      : `<p dir="rtl">לחצו לאיפוס הסיסמה:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p dir="rtl">הקישור תקף לשעה אחת.</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "HiddenSpots <onboarding@resend.dev>",
      to: email,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend failed", await res.text());
    throw new Error("Failed to send email");
  }
  return { emailed: true as const };
}

export async function requestPasswordReset(data: unknown) {
  const { email } = requestSchema.parse(data);
  const { ok } = await rateLimit(`pw-reset:${email.toLowerCase()}`, 3, 60 * 60 * 1000, {
    failClosed: true,
  });
  if (!ok) throw new Error("Too many requests");

  const user = await prisma.user.findUnique({ where: { email } });
  // Always succeed to avoid email enumeration
  if (!user?.passwordHash) {
    return { ok: true as const };
  }

  const raw = randomBytes(32).toString("hex");
  const token = hashToken(raw);
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier: `pw:${email}` } });
  await prisma.verificationToken.create({
    data: { identifier: `pw:${email}`, token, expires },
  });

  const base = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const locale = user.locale === "en" ? "en" : "he";
  const resetUrl = `${base}/${locale}/reset-password?token=${raw}`;
  const mail = await sendResetEmail(email, resetUrl, locale);

  return {
    ok: true as const,
    // Never echo reset URLs in production (even without Resend)
    ...(mail.emailed || process.env.NODE_ENV === "production"
      ? {}
      : { devResetUrl: resetUrl }),
  };
}

export async function resetPassword(data: unknown) {
  const { token: raw, password } = resetSchema.parse(data);
  const token = hashToken(raw);

  const record = await prisma.verificationToken.findFirst({
    where: { token, expires: { gt: new Date() } },
  });
  if (!record || !record.identifier.startsWith("pw:")) {
    throw new Error("Invalid or expired token");
  }

  const email = record.identifier.slice(3);
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });
  await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });
  return { ok: true as const };
}
