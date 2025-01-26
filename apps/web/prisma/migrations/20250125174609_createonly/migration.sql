/*
  Warnings:

  - Made the column `userId` on table `Page` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Page" DROP CONSTRAINT "Page_userId_fkey";

-- AlterTable
ALTER TABLE "Page" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- まず既存のNULLデータにデフォルト値を設定
UPDATE "Page" SET "userId" = (SELECT id FROM "User" LIMIT 1) WHERE "userId" IS NULL;

-- その後でNOT NULL制約を追加
ALTER TABLE "Page" ALTER COLUMN "userId" SET NOT NULL;