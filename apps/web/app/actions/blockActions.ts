'use server';

import { type Block as PrismaBlock, Prisma } from "@prisma/client";
import type { Block, BlockType } from "@/types/page";
import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/utils/embedding";
import { isValidBlockType } from "@/utils/blockUtils";
import { v4 as uuidv4 } from "uuid";

const generateBlockId = (pageId: string): string => {
  return `${pageId}-${uuidv4().split("-")[0]}`;
};

export async function createBlockAction(blockData: Partial<Block>): Promise<Block> {
  if (!blockData.pageId) {
    throw new Error("pageId is required");
  }

  const blockId = blockData.id || generateBlockId(blockData.pageId);

  try {
    let embeddingVector: number[] = [];
    if (blockData.content) {
      try {
        embeddingVector = await getEmbedding(blockData.content);
      } catch (error) {
        console.error("Embedding generation failed:", error);
      }
    }

    const blockType = (blockData.type && isValidBlockType(blockData.type) ? blockData.type : "text") as BlockType;

    const result = await prisma.$queryRaw`
      INSERT INTO "Block" (
        id, type, content, "pageId", "order", checked, embedding, "createdAt", "updatedAt"
      ) VALUES (
        ${blockId}, ${blockType}, ${blockData.content || ""}, 
        ${blockData.pageId}, ${blockData.order || 1}, ${blockData.checked ?? null},
        ${embeddingVector}, NOW(), NOW()
      )
      RETURNING id, type, content, "pageId", "order", checked, embedding::float[], "createdAt", "updatedAt"
    `;

    const block = (result as any[])[0];
    return {
      ...block,
      embedding: block.embedding || [],
    } as Block;
  } catch (error) {
    throw error;
  }
}

export async function updateBlockAction(id: string, blockData: Partial<Omit<Block, 'id'>>): Promise<Block> {
  try {
    let embeddingVector: number[] = [];
    if (blockData.content) {
      try {
        embeddingVector = await getEmbedding(blockData.content);
      } catch (error) {
        console.error("Embedding generation failed:", error);
      }
    }

    const blockType = blockData.type && isValidBlockType(blockData.type) ? blockData.type as BlockType : undefined;

    const updates = [
      blockType && `type = ${blockType}`,
      blockData.content !== undefined && `content = ${blockData.content}`,
      blockData.order !== undefined && `"order" = ${blockData.order}`,
      blockData.checked !== undefined && `checked = ${blockData.checked}`,
      embeddingVector.length > 0 && `embedding = ${embeddingVector}`,
      `"updatedAt" = NOW()`
    ].filter(Boolean).join(', ');

    if (!updates) return (await prisma.$queryRaw`SELECT * FROM "Block" WHERE id = ${id}` as any[])[0] as Block;

const result = await prisma.$queryRaw`
  UPDATE "Block" 
  SET ${Prisma.raw(updates)}
  WHERE id = ${id}
  RETURNING id, type, content, "pageId", "order", checked, embedding::float[], "createdAt", "updatedAt"
`;

    const block = (result as any[])[0];
    return {
      ...block,
      embedding: block.embedding || [],
    } as Block;
  } catch (error) {
    throw error;
  }
}