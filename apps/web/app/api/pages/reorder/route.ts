// app/api/pages/reorder/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { pageId, newOrder } = await req.json();
  
  const page = await prisma.page.update({
    where: { id: pageId },
    data: { order: newOrder },
  });
  
  return NextResponse.json(page);
}