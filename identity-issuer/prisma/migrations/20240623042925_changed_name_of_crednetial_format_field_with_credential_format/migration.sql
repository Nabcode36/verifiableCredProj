/*
  Warnings:

  - You are about to drop the column `formatRedo` on the `CredentialFormat` table. All the data in the column will be lost.
  - Added the required column `credentialFormat` to the `CredentialFormat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CredentialFormat" DROP COLUMN "formatRedo",
ADD COLUMN     "credentialFormat" JSONB NOT NULL;
