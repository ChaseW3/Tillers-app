// src/app/api/admin/employers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const createEmployerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(1),
  kvkNumber: z.string().min(1),
  vatNumber: z.string().min(1),
  billingAddress: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  contactFirst: z.string().min(1),
  contactLast: z.string().min(1),
  phone: z.string().min(1),
  markupRate: z.number().min(0),
  paymentTermDays: z.number().int().min(1).default(14),
  notes: z.string().optional(),
});

function adminOnly(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>) {
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!adminOnly(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employers = await prisma.employer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      companyName: true,
      contactFirst: true,
      contactLast: true,
      status: true,
      markupRate: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });

  return NextResponse.json(employers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!adminOnly(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = createEmployerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { email, password, ...employerFields } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const employer = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: `${employerFields.contactFirst} ${employerFields.contactLast}`,
        role: "EMPLOYER",
      },
    });

    return tx.employer.create({
      data: { userId: user.id, ...employerFields },
      include: { user: { select: { email: true } } },
    });
  });

  const loginUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/login`;

  try {
    await resend.emails.send({
      from: "Tillers Staffing <noreply@tillers.nl>",
      to: email,
      subject: "Your Tillers Staffing account is ready",
      text: [
        "Welcome to Tillers Staffing!",
        "",
        "Your employer account has been created. Use the details below to sign in:",
        "",
        `Login page: ${loginUrl}`,
        `Email:      ${email}`,
        `Password:   ${password}`,
        "",
        "Please change your password after your first login.",
        "",
        "Tillers Staffing",
      ].join("\n"),
    });
  } catch {
    // Email delivery failure should not block account creation
  }

  return NextResponse.json(employer, { status: 201 });
}
