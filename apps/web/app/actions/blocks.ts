// blocks.ts
'use server';

import type { Block, BlockType } from "@/types/page";
import { prisma } from "@/lib/prisma";
import { generateBlockId, isValidBlockType } from "@/utils/blockUtils";
import axios from 'axios';
import { Prisma } from "@prisma/client";

export async function getEmbedding(text: string): Promise<number[]> {
    // Validate the input
    if (typeof text !== 'string' || !text.trim()) {
        throw new Error('Invalid input: text must be a non-empty string');
    }

    // APIキーの確認
    const apiKey = process.env.NEXT_PUBLIC_HUGGING_FACE_API_KEY;
    if (!apiKey) {
        throw new Error('HuggingFace API key is not configured');
    }

    const payload = {
        inputs: text.trim(),
        options: { wait_for_model: true, use_cache: true }
    };

    try {
        const response = await axios.post(
            'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (!Array.isArray(response.data)) {
            console.error('Unexpected response format:', response.data);
            throw new Error('Invalid response format');
        }

        return response.data.map(value => {
            const num = Number(value);
            if (isNaN(num)) {
                throw new Error('Invalid number in embedding');
            }
            return num;
        });
    } catch (error) {
        console.error('Embedding generation error:', error);
        if (error.response?.data) {
            console.error('API error response:', error.response.data);
        }
        throw error;
    }
}

export async function getBlocksByPageId(pageId: string): Promise<Block[]> {
    try {
        const blocks = await prisma.$queryRaw`
            SELECT 
                id, 
                type, 
                content, 
                "pageId", 
                "order", 
                checked,
                embedding::text as embedding,
                "useCount",
                "avgSimilarity",
                "createdAt", 
                "updatedAt"
            FROM "Block"
            WHERE "pageId" = ${pageId}
            ORDER BY "order" ASC
        `;
        
        return (blocks as any[]).map(block => ({
            ...block,
            type: block.type as BlockType,
            embedding: block.embedding
                ? JSON.parse(block.embedding.replace('[', '[').replace(']', ']'))
                : []
        }));
    } catch (error) {
        console.error(`Error fetching blocks for page ${pageId}:`, error);
        return [];
    }
}

export async function upsertBlock(blockData: Partial<Block>): Promise<void> {
    if (!blockData?.pageId) throw new Error("pageId is required");

    const id = blockData.id || generateBlockId(blockData.pageId);
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
                id, 
                type, 
                content, 
                "pageId", 
                "order", 
                checked, 
                embedding,
                "useCount", 
                "avgSimilarity", 
                "createdAt", 
                "updatedAt"
            ) 
            VALUES (
                ${id},
                ${blockData.type || 'text'}::text::"BlockType",
                ${blockData.content || ''},
                ${blockData.pageId},
                ${blockData.order || 0},
                ${blockData.checked ?? false},
                ${Prisma.raw(`'[${embedding.join(',')}]'::vector`)},
                ${blockData.useCount || 0},
                ${blockData.avgSimilarity || 0},
                NOW(),
                NOW()
            )
            ON CONFLICT ("pageId", "order") 
            DO UPDATE SET
                type = EXCLUDED.type,
                content = EXCLUDED.content,
                checked = EXCLUDED.checked,
                embedding = EXCLUDED.embedding,
                "useCount" = COALESCE(EXCLUDED."useCount", "Block"."useCount"),
                "avgSimilarity" = COALESCE(EXCLUDED."avgSimilarity", "Block"."avgSimilarity"),
                "updatedAt" = NOW()
        `;
    } catch (error) {
        console.error("Error upserting block:", error);
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

export async function updateBlock(id: string, blockData: Partial<Block>): Promise<Block> {
    if (!blockData) throw new Error('Block data is required');

    try {
        let embedding: number[] | null = null;
        
        if (blockData.content?.trim()) {
            embedding = await getEmbedding(blockData.content);
        }

        if (embedding) {
            const blocks = await prisma.$queryRaw`
                UPDATE "Block"
                SET
                    type = COALESCE(${blockData.type}::text::"BlockType", type),
                    content = COALESCE(${blockData.content}, content),
                    "order" = COALESCE(${blockData.order}, "order"),
                    checked = COALESCE(${blockData.checked}, checked),
                    embedding = ${Prisma.raw(`'[${embedding.join(',')}]'::vector`)},
                    "updatedAt" = NOW()
                WHERE id = ${id}
                RETURNING id, type, content, "pageId", "order", checked, embedding::text as embedding, "createdAt", "updatedAt"
            `;

            if (Array.isArray(blocks) && blocks.length > 0) {
                const block = blocks[0];
                return {
                    ...block,
                    type: block.type as BlockType,
                    embedding: block.embedding ? JSON.parse(block.embedding) : []
                };
            }
        } else {
            const blocks = await prisma.$queryRaw`
                UPDATE "Block"
                SET
                    type = COALESCE(${blockData.type}::text::"BlockType", type),
                    content = COALESCE(${blockData.content}, content),
                    "order" = COALESCE(${blockData.order}, "order"),
                    checked = COALESCE(${blockData.checked}, checked),
                    "updatedAt" = NOW()
                WHERE id = ${id}
                RETURNING id, type, content, "pageId", "order", checked, embedding::text as embedding, "createdAt", "updatedAt"
            `;

            if (Array.isArray(blocks) && blocks.length > 0) {
                const block = blocks[0];
                return {
                    ...block,
                    type: block.type as BlockType,
                    embedding: block.embedding ? JSON.parse(block.embedding) : []
                };
            }
        }

        throw new Error('Block not found');
    } catch (error) {
        console.error('Error updating block:', error);
        throw new Error('Failed to update block: ' + (error as Error).message);
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