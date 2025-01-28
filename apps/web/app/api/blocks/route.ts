// api/blocks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { upsertBlock, getBlocksByPageId } from "@/app/actions/blocks";

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

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    if (!data.content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (!data.pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    try {
      await upsertBlock({
        pageId: data.pageId,
        type: data.type || 'text',
        content: data.content,
        order: data.order || 0,
      });

      return NextResponse.json({ success: true }, { status: 201 });

    } catch (error) {
      console.error('Block creation error:', error);
      return NextResponse.json({ error: 'Failed to create block with embedding' }, { status: 500 });
    }

  } catch (error) {
    console.error('Request parsing error:', error);
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }
}