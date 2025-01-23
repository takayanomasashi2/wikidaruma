// app/actions/blockActions.ts
'use server';

import { v4 as uuidv4 } from "uuid";
import { Prisma } from "@prisma/client";
import type { Block } from "@/types/page";
import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/utils/embedding";
import { isValidBlockType } from "@/utils/blockUtils";

// blockApi.ts から移動した関数
const generateBlockId = (pageId: string): string => {
    return `${pageId}-${uuidv4().split("-")[0]}`;
};



export async function createBlockAction(blockData: Partial<Block>): Promise<Block> {

console.log("createBlockAction",blockData)

    if (!blockData.pageId) {
        throw new Error("pageId is required to create a block");
    }

    const blockId = blockData.id || generateBlockId(blockData.pageId);

    try {
        let embedding: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined;
        if (blockData.content) {
            try {
                const embeddingVector = await getEmbedding(blockData.content);
                embedding = embeddingVector && embeddingVector.length > 0 ? embeddingVector : Prisma.JsonNull;
            } catch (error) {
                console.error("Failed to generate embedding:", error);
                embedding = Prisma.JsonNull;
            }
        }

        const blockType = blockData.type && isValidBlockType(blockData.type) ? blockData.type : "text";

        const newBlock = await prisma.block.create({
            data: {
                id: blockId,
                type: blockType,
                content: blockData.content || "",
                pageId: blockData.pageId,
                order: blockData.order || 1,
                checked: blockData.checked ?? null,
                embedding: embedding ?? Prisma.JsonNull,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        return newBlock as Block;
    } catch (error) {
        console.error("Block creation failed:", error);
        throw error;
    }
}

export async function updateBlockAction(id: string, blockData: Partial<Omit<Block, 'id'>>): Promise<Block> {

console.log("updateBlockAction",blockData)

    try {
        const existingBlock = await prisma.block.findUnique({
            where: { id },
        });

        let blockType: typeof blockData.type;
        if (blockData.type && isValidBlockType(blockData.type)) {
            blockType = blockData.type;
        }

        const updateData: Prisma.BlockUncheckedUpdateInput = {
            ...(blockType && { type: blockType }),
            ...(blockData.content !== undefined && { content: blockData.content }),
            ...(blockData.order !== undefined && { order: blockData.order }),
            ...(blockData.checked !== undefined && { checked: blockData.checked }),
            updatedAt: new Date(),
        };

        if (blockData.content && (!existingBlock || blockData.content !== existingBlock.content)) {
            try {
                const embeddingVector = await getEmbedding(blockData.content);
                updateData.embedding = embeddingVector && embeddingVector.length > 0 ? embeddingVector : Prisma.JsonNull;
            } catch (error) {
                console.error("Failed to generate embedding:", error);
                updateData.embedding = Prisma.JsonNull;
            }
        }

        if (!existingBlock) {
            return createBlockAction({
                ...blockData,
                id,
            });
        }

        const updatedBlock = await prisma.block.update({
            where: { id },
            data: updateData,
        });

        return updatedBlock as Block;
    } catch (error) {
        console.error("Block update failed:", error);
        throw error;
    }
}