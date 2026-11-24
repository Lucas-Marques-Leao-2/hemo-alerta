-- AlterEnum
ALTER TYPE "CampaignStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "closedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'ATTENDED', 'MISSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "AppointmentPeriod" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('DONOR_LINK', 'STAFF');

-- CreateEnum
CREATE TYPE "InvitationResponse" AS ENUM ('SCHEDULED', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "donatedAt" DATE NOT NULL,
    "notes" TEXT,
    "appointmentId" TEXT,
    "previousLastDonationAt" DATE,
    "recordedById" TEXT,
    "recordedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_appointments" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "invitationId" TEXT,
    "scheduledFor" DATE NOT NULL,
    "period" "AppointmentPeriod" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "source" "AppointmentSource" NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_invitations" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "response" "InvitationResponse",
    "respondedAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "donations_appointmentId_key" ON "donations"("appointmentId");

-- CreateIndex
CREATE INDEX "donations_donorId_donatedAt_idx" ON "donations"("donorId", "donatedAt");

-- CreateIndex
CREATE INDEX "donations_donatedAt_idx" ON "donations"("donatedAt");

-- CreateIndex
CREATE INDEX "donation_appointments_status_scheduledFor_idx" ON "donation_appointments"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "donation_appointments_donorId_status_idx" ON "donation_appointments"("donorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_invitations_campaignId_donorId_key" ON "campaign_invitations"("campaignId", "donorId");

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "donation_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_appointments" ADD CONSTRAINT "donation_appointments_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_appointments" ADD CONSTRAINT "donation_appointments_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "campaign_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "campaign_invitations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "campaign_invitations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
