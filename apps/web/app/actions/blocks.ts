// blocks.ts
'use server';

import type { Block, BlockType } from "@/types/page";
import { prisma } from "@/lib/prisma";
import { generateBlockId, isValidBlockType } from "@/utils/blockUtils";
import axios from 'axios';
import { Prisma } from "@prisma/client";

export async function getEmbedding(text: string): Promise<number[]> {
   try {
       const response = await axios.post(
           "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
           {
               inputs: text,
               options: { wait_for_model: true, use_cache: true }
           },
           {
               headers: {
                   Authorization: `Bearer ${process.env.NEXT_PUBLIC_HUGGING_FACE_API_KEY}`,
                   "Content-Type": "application/json"
               }
           }
       );

       if (Array.isArray(response.data)) return response.data;
       throw new Error("Unexpected response format");
   } catch (error) {
       console.error("Embedding generation error:", error);
       throw error;
   }
}

export async function createBlock(blockData: Partial<Block>): Promise<Block> {
   if (!blockData?.pageId) throw new Error("pageId is required");

   const id = generateBlockId(blockData.pageId);
   let embedding: number[] | null = null;

   try {
       if (blockData.embedding) {
           embedding = Array.isArray(blockData.embedding) ? blockData.embedding :
                      typeof blockData.embedding === 'string' ? JSON.parse(blockData.embedding) :
                      typeof blockData.embedding === 'object' ? Object.values(blockData.embedding) :
                      null;
       }

       if (!embedding && blockData.content?.trim()) {
           embedding = await getEmbedding(blockData.content);
       }

       if (!embedding || embedding.length === 0) {
           throw new Error("Valid embedding is required");
       }

      await prisma.$executeRaw`
    INSERT INTO "Block" (
        id, type, content, "pageId", "order", checked, embedding,
        "useCount", "avgSimilarity", "createdAt", "updatedAt"
    ) VALUES (
        ${id},
        (${blockData.type || 'text'})::text::"BlockType",
        ${blockData.content || ''},
        ${blockData.pageId},
        ${blockData.order || 0},
        ${blockData.checked ?? false},
        ${`[${embedding.join(',')}]`}::vector(384),
        0,
        0,
        NOW(),
        NOW()
    );
`;

       const createdBlock = await prisma.block.findUnique({
           where: { id }
       });

       if (!createdBlock) throw new Error("Failed to create block");

       return {
           ...createdBlock,
           embedding: embedding
       } as Block;
   } catch (error) {
       console.error("Block creation failed:", error);
       throw error;
   }
}

function mapBlockType(type: string): BlockType {
 const validTypes: Record<string, BlockType> = {
   text: 'text',
   todo: 'todo', 
   heading: 'heading',
   heading1: 'heading1',
   heading2: 'heading2',
   heading3: 'heading3',
   subheading: 'subheading',
   quote: 'quote',
   code: 'codeBlock',
   paragraph: 'paragraph',
   orderedList: 'orderedList', 
   listItem: 'listItem',
   taskList: 'taskList',
   horizontalRule: 'horizontalRule',
   math: 'math',
   twitter: 'twitter',
   doc: 'doc',
   mark_code: 'mark_code',
   bulletList: 'bulletList',
   mark_link: 'mark_link'
 };

 return validTypes[type] || 'text';
}

export async function getBlocksByPageId(pageId: string): Promise<Block[]> {
    try {
        const blocks = await prisma.$queryRaw`
            SELECT 
                id, type, content, "pageId", "order", checked,
                embedding::float[] as embedding,
                "createdAt", "updatedAt"
            FROM "Block"
            WHERE "pageId" = ${pageId}
            ORDER BY "order" ASC
        `;
        
        return (blocks as any[]).map(block => ({
            ...block,
            type: block.type as BlockType,
            embedding: Array.isArray(block.embedding) ? block.embedding : []
        }));
    } catch (error) {
        console.error(`Error fetching blocks for page ${pageId}:`, error);
        return [];
    }
}

export async function updateBlock(id: string, blockData: Partial<Block>): Promise<Block> {
 if (!blockData) throw new Error('Block data is required');

 try {
   const mappedType = mapBlockType(blockData.type);
   let embedding: number[] | null = null;
  
   if (blockData.content?.trim()) {
     embedding = await getEmbedding(blockData.content);
   }

   const result = await prisma.$queryRaw`
     UPDATE "Block"
     SET
       type = ${mappedType},
       content = ${blockData.content},
       "order" = ${blockData.order},
       checked = ${blockData.checked},
       embedding = ${embedding ? `[${embedding.join(',')}]::vector(384)` : null},
       "updatedAt" = NOW()
     WHERE id = ${id}
     RETURNING id, type, content, "pageId", "order", checked, embedding::float[], "createdAt", "updatedAt"
   `;

   const updatedBlock = (result as any[])[0];
   return {
     ...updatedBlock,
     embedding: embedding ?? []
   } as Block;
 } catch (error) {
   throw error;
 }
}



// blocks.tsに追加
export async function deleteBlocksByPageId(pageId: string): Promise<void> {
    try {
        await prisma.block.deleteMany({
            where: { pageId }
        });
    } catch (error) {
        console.error(`Error deleting blocks for page ${pageId}:`, error);
        throw error;
    }
}

export async function deleteBlock(id: string): Promise<void> {
    try {
        await prisma.block.delete({
            where: { id }
        });
    } catch (error) {
        console.error(`Error deleting block ${id}:`, error);
        throw error;
    }
}