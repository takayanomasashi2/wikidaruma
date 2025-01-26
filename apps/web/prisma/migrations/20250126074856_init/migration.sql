/*
  Warnings:

  - A unique constraint covering the columns `[id,userId]` on the table `Page` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Page_userId_idx" ON "Page"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_id_userId_key" ON "Page"("id", "userId");
