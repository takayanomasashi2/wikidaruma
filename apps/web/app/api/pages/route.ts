// app/api/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { defaultEditorContent } from '@/lib/content';
// app/api/pages/route.ts

export async function POST(req: Request) {
  try {
    const { title, parentId } = await req.json();
    
    const maxOrder = await prisma.page.findFirst({
      where: { parentId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const page = await prisma.page.create({
      data: {
        title,
        parentId,
        order: (maxOrder?.order ?? -1) + 1,
        content: JSON.stringify(defaultEditorContent), // デフォルトコンテンツを使用
      },
    });
    
    // 作成したページを子ページを含めて返す
    const createdPage = await prisma.page.findUnique({
      where: { id: page.id },
      include: {
        children: true
      }
    });
    
    return NextResponse.json(createdPage);
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
} 

export const GET = async (request: NextRequest) => {
  try {
    const pages = await prisma.page.findMany({
      where: { parentId: null }, // トップレベルのページのみ
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true // 3階層まで取得
              }
            }
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
};

// 他のメソッドは変更なし