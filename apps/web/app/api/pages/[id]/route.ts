// app/api/pages/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/app/auth';
import { Prisma } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();

    // タイトルが明示的に指定された場合のみ更新データに含める
    const updateData: { title?: string; content?: string } = {};
    if (data.title !== undefined) {
      updateData.title = data.title.trim() || 'Untitled';
    }
    if (data.content !== undefined) {
      updateData.content = data.content;
    }

    const updatedPage = await prisma.page.update({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      data: updateData,
    });

    return NextResponse.json(updatedPage);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    console.error('Error updating page:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // トランザクションを使用して、関連するブロックとページを削除
    await prisma.$transaction(async (tx) => {
      // 1. まず関連するブロックを削除
      await tx.block.deleteMany({
        where: {
          pageId: params.id,
          page: {
            userId: session.user.id // 権限チェックのため
          }
        },
      });

      // 2. ページを削除
      await tx.page.delete({
        where: {
          id: params.id,
          userId: session.user.id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }
      // その他のPrismaエラーのハンドリング
      console.error('Prisma error deleting page:', error);
      return NextResponse.json(
        { error: 'Database error while deleting page' },
        { status: 500 }
      );
    }
    // 予期しないエラーのハンドリング
    console.error('Unexpected error deleting page:', error);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}