import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("ChangeMeAdmin123!", 12);
  const hotelPassword = await bcrypt.hash("ChangeMeHotel123!", 12);

  await prisma.pricingConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      currency: "TZS",
      customerSmsPrice: 25,
      providerSmsCost: 18,
      minimumPurchase: 1000,
      lowCreditThreshold: 500,
      packages: [1000, 5000, 10000, 25000],
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@smscredit.local" },
    update: {},
    create: {
      email: "admin@smscredit.local",
      name: "Platform Admin",
      passwordHash: adminPassword,
      role: "PLATFORM_ADMIN",
    },
  });

  const business = await prisma.business.upsert({
    where: { email: "hotel@demo.local" },
    update: {},
    create: {
      name: "XYZ Hotel",
      ownerName: "Amina Hotelier",
      email: "hotel@demo.local",
      phone: "+255712345678",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "hotel@demo.local" },
    update: {},
    create: {
      businessId: business.id,
      email: "hotel@demo.local",
      name: "Amina Hotelier",
      passwordHash: hotelPassword,
      role: "BUSINESS_USER",
    },
  });

  await prisma.wallet.upsert({
    where: { businessId: business.id },
    update: {},
    create: { businessId: business.id, balance: 5000 },
  });

  const existingPayment = await prisma.payment.findFirst({ where: { businessId: business.id } });
  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        businessId: business.id,
        provider: "sandbox",
        orderId: "ord_demo_seed",
        providerTransactionId: "sbx_demo_seed",
        amount: 125000,
        currency: "TZS",
        credits: 5000,
        unitPrice: 25,
        status: "SUCCESS",
        paymentMethod: "SANDBOX_MOBILE_MONEY",
      },
    });
    await prisma.walletTransaction.create({
      data: {
        businessId: business.id,
        type: "CREDIT_PURCHASE",
        amount: 5000,
        balanceBefore: 0,
        balanceAfter: 5000,
        description: "Seed purchase of 5000 SMS credits",
      },
    });
    await prisma.message.create({
      data: {
        businessId: business.id,
        recipient: "+255712345678",
        messageBody: "Welcome to XYZ Hotel. Your booking has been confirmed.",
        senderId: "XYZHOTEL",
        status: "DELIVERED",
        providerMessageId: "sbx_seed_message",
        creditsUsed: 1,
        segments: 1,
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin: admin@smscredit.local / ChangeMeAdmin123!");
  console.log("Hotel: hotel@demo.local / ChangeMeHotel123!");
  console.log("Change these passwords before any shared deployment.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
