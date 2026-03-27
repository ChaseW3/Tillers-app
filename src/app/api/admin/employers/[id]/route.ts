// src/app/api/admin/employers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateEmployerSchema = z.object({
  companyName: z.string().min(1).optional(),
  kvkNumber: z.string().min(1).optional(),
  vatNumber: z.string().min(1).optional(),
  billingAddress: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  contactFirst: z.string().min(1).optional(),
  contactLast: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  markupRate: z.number().min(0).optional(),
  paymentTermDays: z.number().int().min(1).optional(),
  notes: z.string().nullable().optional(),
  status: z
    .enum(["INVITED", "PENDING_SIGNATURE", "ACTIVE", "INACTIVE"])
    .optional(),
});

function adminOnly(session: Awaited<ReturnType<typeof getServerSession>>) {
  const role = (session?.user as typeof session.user & { role?: string })?.role;
  return session && role === "ADMIN";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!adminOnly(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const employer = await prisma.employer.findUnique({
    where: { id },
    include: { user: { select: { email: true } } },
  });

  if (!employer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(employer);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!adminOnly(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const result = updateEmployerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const employer = await prisma.employer.update({
    where: { id },
    data: result.data,
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json(employer);
}
