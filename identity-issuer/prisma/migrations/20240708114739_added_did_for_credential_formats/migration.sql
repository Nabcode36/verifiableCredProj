/*
  Warnings:

  - Added the required column `issuerDID` to the `CredentialFormat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CredentialFormat" ADD COLUMN     "issuerDID" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "CredentialFormat" ADD CONSTRAINT "CredentialFormat_issuerDID_fkey" FOREIGN KEY ("issuerDID") REFERENCES "Issuer"("issuerDID") ON DELETE RESTRICT ON UPDATE CASCADE;
