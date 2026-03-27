import { PrismaClient, Role, StudentStatus, EmployerStatus, ContractPhase, ContractStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  // ─── Admin ───────────────────────────────────────────────────────────────────

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@tillers.nl" },
    update: {},
    create: {
      email: "admin@tillers.nl",
      name: "Admin",
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash("admin123", 10),
    },
  });

  console.log("  Admin:", adminUser.email);

  // ─── Employers ───────────────────────────────────────────────────────────────

  const employer1User = await prisma.user.upsert({
    where: { email: "contact@events-bv.nl" },
    update: {},
    create: {
      email: "contact@events-bv.nl",
      name: "Jan de Vries",
      role: Role.EMPLOYER,
      passwordHash: await bcrypt.hash("employer123", 10),
    },
  });

  const employer1 = await prisma.employer.upsert({
    where: { userId: employer1User.id },
    update: {},
    create: {
      userId: employer1User.id,
      companyName: "Events BV",
      kvkNumber: "12345678",
      vatNumber: "NL123456789B01",
      billingAddress: "Keizersgracht 100",
      city: "Amsterdam",
      postalCode: "1015 CL",
      contactFirst: "Jan",
      contactLast: "de Vries",
      phone: "+31612345678",
      markupRate: 35,
      paymentTermDays: 14,
      status: EmployerStatus.ACTIVE,
    },
  });

  const employer2User = await prisma.user.upsert({
    where: { email: "hr@horeca-groep.nl" },
    update: {},
    create: {
      email: "hr@horeca-groep.nl",
      name: "Lisa Bakker",
      role: Role.EMPLOYER,
      passwordHash: await bcrypt.hash("employer123", 10),
    },
  });

  const employer2 = await prisma.employer.upsert({
    where: { userId: employer2User.id },
    update: {},
    create: {
      userId: employer2User.id,
      companyName: "Horeca Groep Rotterdam",
      kvkNumber: "87654321",
      vatNumber: "NL987654321B01",
      billingAddress: "Coolsingel 45",
      city: "Rotterdam",
      postalCode: "3012 AD",
      contactFirst: "Lisa",
      contactLast: "Bakker",
      phone: "+31687654321",
      markupRate: 30,
      paymentTermDays: 30,
      status: EmployerStatus.ACTIVE,
    },
  });

  console.log("  Employers:", employer1.companyName, "|", employer2.companyName);

  // ─── Students ────────────────────────────────────────────────────────────────

  const studentsData = [
    {
      email: "emma.jansen@student.nl",
      name: "Emma Jansen",
      firstName: "Emma",
      lastName: "Jansen",
      phone: "+31611111111",
      hourlyRate: 13.27,
    },
    {
      email: "noah.smit@student.nl",
      name: "Noah Smit",
      firstName: "Noah",
      lastName: "Smit",
      phone: "+31622222222",
      hourlyRate: 13.27,
    },
    {
      email: "lotte.visser@student.nl",
      name: "Lotte Visser",
      firstName: "Lotte",
      lastName: "Visser",
      phone: "+31633333333",
      hourlyRate: 14.50,
    },
  ];

  const students = [];

  for (const data of studentsData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        name: data.name,
        role: Role.STUDENT,
        passwordHash: await bcrypt.hash("student123", 10),
      },
    });

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date("2001-06-15"),
        phone: data.phone,
        address: "Studentenlaan 1",
        city: "Amsterdam",
        postalCode: "1012 AB",
        nationality: "NL",
        bsnEncrypted: "PLACEHOLDER_ENCRYPTED_BSN", // replace with real AES-256 encryption in prod
        iban: "NL91ABNA0417164300",
        ibanHolderName: `${data.firstName} ${data.lastName}`,
        university: "Universiteit van Amsterdam",
        studyProgram: "Bedrijfskunde",
        graduationYear: 2026,
        emergencyName: "Ouder",
        emergencyPhone: "+31600000000",
        hourlyRate: data.hourlyRate,
        status: StudentStatus.ACTIVE,
      },
    });

    students.push(student);
  }

  console.log("  Students:", students.length);

  // ─── Contracts (Fase A) ───────────────────────────────────────────────────────

  for (const student of students) {
    const existing = await prisma.contract.findFirst({
      where: { studentId: student.id, phase: ContractPhase.FASE_A },
    });

    if (!existing) {
      await prisma.contract.create({
        data: {
          studentId: student.id,
          employerId: employer1.id,
          phase: ContractPhase.FASE_A,
          status: ContractStatus.ACTIVE,
          startDate: new Date("2026-01-01"),
          hourlyRate: student.hourlyRate,
          workedWeeks: 4,
          signedAt: new Date("2026-01-01"),
        },
      });
    }
  }

  console.log("  Contracts: done");
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
