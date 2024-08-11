-- CreateTable
CREATE TABLE "CurrentIssuer" (
    "id" TEXT NOT NULL,
    "issuerDID" TEXT NOT NULL,

    CONSTRAINT "CurrentIssuer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CurrentIssuer" ADD CONSTRAINT "CurrentIssuer_issuerDID_fkey" FOREIGN KEY ("issuerDID") REFERENCES "Issuer"("issuerDID") ON DELETE RESTRICT ON UPDATE CASCADE;
