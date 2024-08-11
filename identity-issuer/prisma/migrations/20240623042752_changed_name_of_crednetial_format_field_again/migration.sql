/*
  Warnings:

  - You are about to drop the column `format` on the `CredentialFormat` table. All the data in the column will be lost.
  - Added the required column `formatRedo` to the `CredentialFormat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CredentialFormat" DROP COLUMN "format",
ADD COLUMN     "formatRedo" JSONB NOT NULL;
