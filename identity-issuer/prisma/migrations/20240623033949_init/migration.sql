-- CreateTable
CREATE TABLE "Issuer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "didDoc" JSONB NOT NULL,
    "issuerDID" TEXT NOT NULL,

    CONSTRAINT "Issuer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialFormat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attributeKeys" JSONB NOT NULL,

    CONSTRAINT "CredentialFormat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "issuerDID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formatId" TEXT NOT NULL,
    "userPublicKey" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Issuer_name_key" ON "Issuer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Issuer_issuerDID_key" ON "Issuer"("issuerDID");

-- CreateIndex
CREATE UNIQUE INDEX "CredentialFormat_name_key" ON "CredentialFormat"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_userId_formatId_key" ON "Credential"("userId", "formatId");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "CredentialFormat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_issuerDID_fkey" FOREIGN KEY ("issuerDID") REFERENCES "Issuer"("issuerDID") ON DELETE RESTRICT ON UPDATE CASCADE;
