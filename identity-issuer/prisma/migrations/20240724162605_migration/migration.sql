/*
  Warnings:

  - You are about to drop the column `formatId` on the `Credential` table. All the data in the column will be lost.
  - You are about to drop the `CredentialFormat` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,configurationId]` on the table `Credential` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `configurationId` to the `Credential` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Credential" DROP CONSTRAINT "Credential_formatId_fkey";

-- DropForeignKey
ALTER TABLE "CredentialFormat" DROP CONSTRAINT "CredentialFormat_issuerDID_fkey";

-- DropIndex
DROP INDEX "Credential_userId_formatId_key";

-- AlterTable
ALTER TABLE "Credential" DROP COLUMN "formatId",
ADD COLUMN     "configurationId" TEXT NOT NULL;

-- DropTable
DROP TABLE "CredentialFormat";

-- CreateTable
CREATE TABLE "CredentialConfiguration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuerDID" TEXT NOT NULL,
    "credentialConfiguration" JSONB[],

    CONSTRAINT "CredentialConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CredentialConfiguration_name_key" ON "CredentialConfiguration"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_userId_configurationId_key" ON "Credential"("userId", "configurationId");

-- AddForeignKey
ALTER TABLE "CredentialConfiguration" ADD CONSTRAINT "CredentialConfiguration_issuerDID_fkey" FOREIGN KEY ("issuerDID") REFERENCES "Issuer"("issuerDID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "CredentialConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
