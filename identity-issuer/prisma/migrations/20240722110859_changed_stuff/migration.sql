/*
  Warnings:

  - A unique constraint covering the columns `[issuerDID]` on the table `CurrentIssuer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `CurrentIssuer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CurrentIssuer_issuerDID_key" ON "CurrentIssuer"("issuerDID");

-- CreateIndex
CREATE UNIQUE INDEX "CurrentIssuer_id_key" ON "CurrentIssuer"("id");
