-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('text', 'todo', 'heading', 'heading1', 'heading2', 'heading3', 'subheading', 'quote', 'codeBlock', 'paragraph', 'orderedList', 'listItem', 'taskList', 'horizontalRule', 'math', 'twitter', 'doc', 'mark_code', 'mark_link', 'bulletList');

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "content" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "checked" BOOLEAN DEFAULT false,
    "embedding" vector(384) NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "avgSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
