import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { pushSubscriptionSchema } from "@/lib/push/subscription";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Unguarded req.json() turned any malformed body into a 500 rather than the
  // 400 it is.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // The endpoint is a URL this server will POST to once delivery ships, so an
  // unvalidated one is a server-side request primitive handed to any logged-in
  // user. See lib/push/subscription.ts.
  const parsed = pushSubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { pushSubscription: JSON.stringify(parsed.data) },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id: session.user.id }, data: { pushSubscription: null } });
  return NextResponse.json({ ok: true });
}
