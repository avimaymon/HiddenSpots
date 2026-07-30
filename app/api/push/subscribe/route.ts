import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as PushSubscriptionJSON;
  if (!body.endpoint) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { pushSubscription: JSON.stringify(body) },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id: session.user.id }, data: { pushSubscription: null } });
  return NextResponse.json({ ok: true });
}
