import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET required for OAuth state");
  }
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export type DriveOAuthStatePayload = {
  userId: string;
  nonce: string;
  exp: number;
};

/** HMAC-signed Drive OAuth state — never put bare userId in `state`. */
export function signDriveOAuthState(
  userId: string,
  ttlMs = DEFAULT_TTL_MS,
  now = Date.now()
): string {
  const payload: DriveOAuthStatePayload = {
    userId,
    nonce: b64url(randomBytes(16)),
    exp: now + ttlMs,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyDriveOAuthState(
  state: string,
  now = Date.now()
): DriveOAuthStatePayload | null {
  const dot = state.indexOf(".");
  if (dot <= 0 || dot === state.length - 1) return null;
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  let expected: string;
  try {
    expected = createHmac("sha256", secret()).update(body).digest("base64url");
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as DriveOAuthStatePayload;
    if (
      typeof payload.userId !== "string" ||
      !payload.userId ||
      typeof payload.nonce !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
