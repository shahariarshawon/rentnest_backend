/*
  Warnings:

  - A unique constraint covering the columns `[gatewayValidationId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bankTransactionId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "bankTransactionId" TEXT,
ADD COLUMN     "gatewayUrl" TEXT,
ADD COLUMN     "gatewayValidationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayValidationId_key" ON "Payment"("gatewayValidationId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bankTransactionId_key" ON "Payment"("bankTransactionId");

-- CreateIndex
CREATE INDEX "Payment_provider_status_idx" ON "Payment"("provider", "status");
