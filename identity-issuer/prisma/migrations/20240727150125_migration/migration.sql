/*
  Warnings:

  - You are about to drop the `_CredentialToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CredentialToUser" DROP CONSTRAINT "_CredentialToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_CredentialToUser" DROP CONSTRAINT "_CredentialToUser_B_fkey";

-- DropTable
DROP TABLE "_CredentialToUser";

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userDID") ON DELETE RESTRICT ON UPDATE CASCADE;
