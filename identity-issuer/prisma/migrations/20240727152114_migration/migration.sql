-- CreateTable
CREATE TABLE "CurrentUser" (
    "id" TEXT NOT NULL,
    "userDID" TEXT NOT NULL,

    CONSTRAINT "CurrentUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurrentUser_userDID_key" ON "CurrentUser"("userDID");

-- CreateIndex
CREATE UNIQUE INDEX "CurrentUser_id_key" ON "CurrentUser"("id");

-- AddForeignKey
ALTER TABLE "CurrentUser" ADD CONSTRAINT "CurrentUser_userDID_fkey" FOREIGN KEY ("userDID") REFERENCES "User"("userDID") ON DELETE RESTRICT ON UPDATE CASCADE;
