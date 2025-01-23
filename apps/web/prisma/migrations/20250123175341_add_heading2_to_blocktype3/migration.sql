/*
  Warnings:

  - The values [code] on the enum `BlockType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BlockType_new" AS ENUM ('text', 'todo', 'heading', 'heading1', 'heading2', 'heading3', 'subheading', 'quote', 'codeBlock', 'paragraph', 'orderedList', 'listItem', 'taskList', 'horizontalRule', 'math', 'twitter', 'doc', 'mark_code', 'mark_link', 'bulletList');
ALTER TABLE "Block" ALTER COLUMN "type" TYPE "BlockType_new" USING ("type"::text::"BlockType_new");
ALTER TYPE "BlockType" RENAME TO "BlockType_old";
ALTER TYPE "BlockType_new" RENAME TO "BlockType";
DROP TYPE "BlockType_old";
COMMIT;
