// app/api/pages/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { auth } from '@/app/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.page.delete({
      where: {
        id_userId: {
          id: params.id,
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
  { params }: { params: { id: string } }
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
          id: params.id,
          userId: session.user.id
        }
      },
      data: {
        title: data.title,
        content: data.content
      }
    });
    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}