/*
  Warnings:

  - A unique constraint covering the columns `[resetToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Gym" ADD COLUMN     "pricingAnnual" DOUBLE PRECISION NOT NULL DEFAULT 399,
ADD COLUMN     "pricingDaily" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "pricingMonthly" DOUBLE PRECISION NOT NULL DEFAULT 49,
ADD COLUMN     "pricingQuarterly" DOUBLE PRECISION NOT NULL DEFAULT 120;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RateLimitAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitAttempt_key_key" ON "RateLimitAttempt"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");
