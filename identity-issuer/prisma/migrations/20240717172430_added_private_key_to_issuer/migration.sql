/*
  Warnings:

  - The `credentialFormat` column on the `CredentialFormat` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `privateKey` to the `Issuer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CredentialFormat" DROP COLUMN "credentialFormat",
ADD COLUMN     "credentialFormat" JSONB[];

-- AlterTable
ALTER TABLE "Issuer" ADD COLUMN     "privateKey" TEXT NOT NULL;
