'use server';

import type { Block, BlockType } from "@/types/page";
import { prisma } from "@/lib/prisma";
import { generateBlockId, isValidBlockType } from "@/utils/blockUtils";
import axios from 'axios';

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
    if (!blockData?.pageId) {
        throw new Error("pageId is required to create a block");
    }

console.log("run?")

    const blockId = blockData.id || generateBlockId(blockData.pageId);
    let embedding: number[] | null = null;

    try {
        if (blockData.embedding) {
            embedding = Array.isArray(blockData.embedding) ? blockData.embedding :
                       typeof blockData.embedding === 'string' ? JSON.parse(blockData.embedding) :
                       typeof blockData.embedding === 'object' ? Object.values(blockData.embedding) as number[] :
                       null;
        }

        if (!embedding && blockData.content?.trim()) {
            embedding = await getEmbedding(blockData.content);
        }

        const newBlock = await prisma.block.create({
            data: {
                id: blockId,
                type: blockData.type && isValidBlockType(blockData.type) ? blockData.type : "text",
                content: blockData.content || "",
                pageId: blockData.pageId,
                order: blockData.order || 0,
                checked: blockData.checked ?? false,
                embedding: embedding ? JSON.stringify(embedding) : null,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        }) as Block;

        return newBlock;
    } catch (error) {
        console.error("Block creation failed:", error);
        throw error;
    }
}

export async function getBlocksByPageId(pageId: string): Promise<Block[]> {
    try {
        const blocks = await prisma.block.findMany({
            where: { pageId },
            orderBy: { order: 'asc' }
        });
        
        return blocks.map(block => ({
            ...block,
            type: block.type as BlockType,
            embedding: block.embedding ? JSON.parse(block.embedding as string) : null
        }));
    } catch (error) {
        console.error(`Error fetching blocks for page ${pageId}:`, error);
        throw error;
    }
}

export async function updateBlock(id: string, blockData: Partial<Block>): Promise<Block> {
  if (!blockData) throw new Error('Block data is required');

  try {

    const mapBlockType = (type: string): BlockType => {
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

  return validTypes[type] || 'text'; // Default to 'text' if type is invalid
};


    const mappedType = mapBlockType(blockData.type);

const upsertedBlock = await prisma.block.upsert({
  where: { id },
  update: {
    type: mappedType,
    content: blockData.content,
    order: blockData.order,
    checked: blockData.checked,
    updatedAt: new Date(),
  },
  create: {
    id,
    type: mappedType,
    content: blockData.content,
    pageId: blockData.pageId,
    order: blockData.order ?? 0,
    checked: blockData.checked || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
});

    return upsertedBlock as Block;
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