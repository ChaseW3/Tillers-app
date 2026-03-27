// src/app/api/employer/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "EMPLOYER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id;

  const employer = await prisma.employer.findUnique({
    where: { userId },
    select: {
      id: true,
      companyName: true,
      kvkNumber: true,
      vatNumber: true,
      billingAddress: true,
      city: true,
      postalCode: true,
      contactFirst: true,
      contactLast: true,
      phone: true,
      status: true,
    },
  });

  if (!employer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(employer);
}
