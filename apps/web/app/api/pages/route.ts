// app/api/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { defaultEditorContent } from '@/lib/content';
import { auth } from "@/app/auth";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ユーザーの存在確認を追加
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      const newUser = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.name
        }
      });
    }

    const { title, parentId } = await req.json();

    const maxOrder = await prisma.page.findFirst({
      where: {
        userId: session.user.id,
        parentId: parentId ?? null
      },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    const page = await prisma.page.create({
      data: {
        title,
        parentId,
        content: JSON.stringify(defaultEditorContent),
        userId: session.user.id,
        order: (maxOrder?.order ?? -1) + 1
      },
      include: { children: true }
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}

// api/pages/route.ts を修正
export async function DELETE(
  req: NextRequest,
  { params: { id } }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ページの存在と所有権を確認
    const page = await prisma.page.findUnique({
      where: {
        id_userId: {
          id: id,
          userId: session.user.id
        }
      }
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    await prisma.page.delete({
      where: {
        id_userId: {
          id: id,
          userId: session.user.id
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params: { id } }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const updatedPage = await prisma.page.update({
      where: {
        id_userId: {
          id: id,
          userId: session.user.id
        }
      },
      data: {
        title: data.title,
        content: data.content,
        parentId: data.parentId
      }
    });
    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

export const GET = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    console.error("🔴 Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("✅ Fetching pages for user:", session.user.id);
    const pages = await prisma.page.findMany({
      where: {
        userId: session.user.id,
        parentId: null,
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
              },
            },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    console.log("✅ Pages retrieved:", pages);
    return NextResponse.json(pages);
  } catch (error) {
    console.error("🔴 Error fetching pages:", error);
    return NextResponse.json({ error: "Failed to fetch pages", details: error.message }, { status: 500 });
  }
};
