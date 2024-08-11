-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "didId" TEXT NOT NULL,
    "props" JSONB NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CredentialToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_didId_key" ON "User"("didId");

-- CreateIndex
CREATE UNIQUE INDEX "_CredentialToUser_AB_unique" ON "_CredentialToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_CredentialToUser_B_index" ON "_CredentialToUser"("B");

-- AddForeignKey
ALTER TABLE "_CredentialToUser" ADD CONSTRAINT "_CredentialToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CredentialToUser" ADD CONSTRAINT "_CredentialToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
