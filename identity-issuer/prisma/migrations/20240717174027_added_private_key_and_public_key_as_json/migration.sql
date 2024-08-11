/*
  Warnings:

  - Changed the type of `publicKey` on the `Issuer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `privateKey` on the `Issuer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Issuer" DROP COLUMN "publicKey",
ADD COLUMN     "publicKey" JSONB NOT NULL,
DROP COLUMN "privateKey",
ADD COLUMN     "privateKey" JSONB NOT NULL;
