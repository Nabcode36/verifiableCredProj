/*
  Warnings:

  - You are about to drop the column `attributeKeys` on the `CredentialFormat` table. All the data in the column will be lost.
  - Added the required column `format` to the `CredentialFormat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CredentialFormat" DROP COLUMN "attributeKeys",
ADD COLUMN     "format" JSONB NOT NULL;
