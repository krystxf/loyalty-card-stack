-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WalletPassState" AS ENUM ('PENDING', 'ACTIVE');

-- CreateEnum
CREATE TYPE "CoffeeEventType" AS ENUM ('PAID', 'REWARD_EARNED', 'REWARD_REDEEMED', 'MANUAL_ADJUSTMENT');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "appleAuthToken" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "state" "WalletPassState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffeeEvent" (
    "id" SERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "CoffeeEventType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoffeeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppleDevice" (
    "deviceLibraryIdentifier" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppleDevice_pkey" PRIMARY KEY ("deviceLibraryIdentifier")
);

-- CreateTable
CREATE TABLE "ApplePassRegistration" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "deviceLibraryIdentifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplePassRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_appleAuthToken_key" ON "Customer"("appleAuthToken");

-- CreateIndex
CREATE INDEX "CoffeeEvent_customerId_createdAt_idx" ON "CoffeeEvent"("customerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ApplePassRegistration_deviceLibraryIdentifier_idx" ON "ApplePassRegistration"("deviceLibraryIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "ApplePassRegistration_customerId_deviceLibraryIdentifier_key" ON "ApplePassRegistration"("customerId", "deviceLibraryIdentifier");

-- AddForeignKey
ALTER TABLE "CoffeeEvent" ADD CONSTRAINT "CoffeeEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplePassRegistration" ADD CONSTRAINT "ApplePassRegistration_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplePassRegistration" ADD CONSTRAINT "ApplePassRegistration_deviceLibraryIdentifier_fkey" FOREIGN KEY ("deviceLibraryIdentifier") REFERENCES "AppleDevice"("deviceLibraryIdentifier") ON DELETE CASCADE ON UPDATE CASCADE;

