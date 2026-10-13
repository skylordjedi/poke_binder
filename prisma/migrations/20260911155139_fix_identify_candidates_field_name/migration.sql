/*
  Warnings:

  - You are about to drop the column `xidentifyCandidates` on the `cards` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cards" DROP COLUMN "xidentifyCandidates",
ADD COLUMN     "identifyCandidates" JSONB;
