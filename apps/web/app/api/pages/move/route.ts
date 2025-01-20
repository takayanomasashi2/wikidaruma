// app/api/pages/move/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { pageId, newParentId } = await req.json();
  
  const page = await prisma.page.update({
    where: { id: pageId },
    data: { parentId: newParentId },
  });
  
  return NextResponse.json(page);
}