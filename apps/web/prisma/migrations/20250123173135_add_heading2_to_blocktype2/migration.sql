-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BlockType" ADD VALUE 'paragraph';
ALTER TYPE "BlockType" ADD VALUE 'orderedList';
ALTER TYPE "BlockType" ADD VALUE 'listItem';
ALTER TYPE "BlockType" ADD VALUE 'taskList';
ALTER TYPE "BlockType" ADD VALUE 'horizontalRule';
ALTER TYPE "BlockType" ADD VALUE 'math';
ALTER TYPE "BlockType" ADD VALUE 'twitter';
ALTER TYPE "BlockType" ADD VALUE 'doc';
ALTER TYPE "BlockType" ADD VALUE 'mark_code';
ALTER TYPE "BlockType" ADD VALUE 'mark_link';
ALTER TYPE "BlockType" ADD VALUE 'bulletList';
