-- Migration: Multi-Brand Support
-- This migration adds brand support to the schema

-- CreateTable Brand
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "smtpHost" TEXT,
    "smtpPort" TEXT,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "fromEmail" TEXT,
    "emailDelay" INTEGER NOT NULL DEFAULT 1000,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- Add brandId to Contact with temporary NULL
ALTER TABLE "Contact" ADD COLUMN "brandId" TEXT;

-- Add brandId to Campaign 
ALTER TABLE "Campaign" ADD COLUMN "brandId" TEXT;

-- Modify WarmupConfig to use brandId instead of userId
ALTER TABLE "WarmupConfig" ADD COLUMN "brandId" TEXT;

-- Remove email unique constraint from Contact (will be per-brand unique)
ALTER TABLE "Contact" DROP CONSTRAINT IF EXISTS "Contact_email_key";

-- CreateIndex
CREATE INDEX "Brand_userId_idx" ON "Brand"("userId");
CREATE INDEX "Contact_brandId_idx" ON "Contact"("brandId");
CREATE INDEX "Campaign_brandId_idx" ON "Campaign"("brandId");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- This script will be run manually or by Prisma migrate
-- After running, execute the data migration script to populate brandId values
