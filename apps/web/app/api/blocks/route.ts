import { NextRequest, NextResponse } from "next/server";
import { createBlock, getBlocksByPageId } from "@/app/actions/blocks";
import { getEmbedding } from '@/utils/embedding';

export async function GET(req: NextRequest) {
    try {
        const pageId = req.nextUrl.searchParams.get("pageId");
        if (!pageId) {
            return NextResponse.json({ error: "pageId is required" }, { status: 400 });
        }

        const blocks = await getBlocksByPageId(pageId);
        return NextResponse.json(blocks);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { content, type, order, checked, pageId, embedding } = await req.json();
        
        if (!pageId) {
            return NextResponse.json(
                { error: "pageId is required" },
                { status: 400 }
            );
        }

        const blockEmbedding = embedding || await getEmbedding(content);
        
        const newBlock = await createBlock({
            content,
            type,
            order,
            checked,
            pageId,
            embedding: blockEmbedding
        });

        return NextResponse.json(newBlock, { status: 201 });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json(
            { error: String(error) },
            { status: 500 }
        );
    }
}