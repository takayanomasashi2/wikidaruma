// api/chat/route.ts
import { PrismaClient } from '@prisma/client';
import { getEmbedding } from '@/utils/embedding';
import { OpenAI } from 'openai';
import { StreamingTextResponse, OpenAIStream } from 'ai';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TRANSACTION_TIMEOUT = 30000; // 30秒に延長

interface SimilarContentResult {
  content: string;
  similarity: number;
  pageId?: string;
  order?: number;
}

interface ContentWithContext extends SimilarContentResult {
  previousBlocks?: string[];
  followingBlocks?: string[];
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  userId: string;
}

type ChatMessage = {
  role: Message['role'];
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages, userId }: { messages: Message[]; userId: string } = await req.json();
    const stream = await processChat(messages, userId);

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat error:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process chat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const message = url.searchParams.get('message');
    const userId = url.searchParams.get('userId');

    if (!message || !userId) {
      return new NextResponse(JSON.stringify({ error: 'Missing message or userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const messages: Message[] = [{ role: 'user', content: message, userId }];
    const stream = await processChat(messages, userId);

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat error (GET):', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process chat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function processChat(messages: Message[], userId: string) {
  if (!messages?.length) {
    throw new Error('No messages provided');
  }

  const lastMessage = messages[messages.length - 1];
  const queryEmbedding = await getEmbedding(lastMessage.content);

  // トランザクション処理を最適化
  const { contentToUpdate, context } = await prisma.$transaction(async (tx) => {
    const similarContents = await tx.$queryRaw<SimilarContentResult[]>`
      SELECT 
        content,
        "pageId",
        "order",
        1 - (embedding::vector <=> ${queryEmbedding}::vector) as similarity
      FROM "Block"
      WHERE 
        (1 - (embedding::vector <=> ${queryEmbedding}::vector)) > 0.5
        AND "pageId" IN (
          SELECT id FROM "Page" WHERE "userId" = ${userId}
        )
      ORDER BY similarity DESC
      LIMIT 5
    `;

    let contentToUpdate = similarContents;

    if (!similarContents.length) {
      const keywords = lastMessage.content
        .replace(/[はがのにをでやへと。、？！]/g, ' ')
        .split(' ')
        .filter(w => w.length > 0);

      if (keywords.length) {
        const keywordResults = await tx.block.findMany({
          where: {
            OR: keywords.map(keyword => ({
              content: { contains: keyword }
            })),
            page: { userId }
          },
          select: { content: true, pageId: true, order: true },
          take: 5
        });

        contentToUpdate = keywordResults.map(item => ({
          ...item,
          similarity: 0.3
        }));
      }
    }

    const enhancedContent: ContentWithContext[] = await Promise.all(
      contentToUpdate.map(async content => {
        if (content.similarity >= 0.5 && content.pageId && content.order !== undefined) {
          const [previousBlocks, followingBlocks] = await Promise.all([
            tx.block.findMany({
              where: {
                pageId: content.pageId,
                order: { lt: content.order, gte: content.order - 3 }
              },
              orderBy: { order: 'desc' },
              select: { content: true }
            }),
            tx.block.findMany({
              where: {
                pageId: content.pageId,
                order: { gt: content.order, lte: content.order + 3 }
              },
              orderBy: { order: 'asc' },
              select: { content: true }
            })
          ]);

          return {
            ...content,
            previousBlocks: previousBlocks.map(b => b.content),
            followingBlocks: followingBlocks.map(b => b.content)
          };
        }
        return content;
      })
    );

    const context = enhancedContent
      .map(item => {
        const parts = [];
        if (item.previousBlocks?.length) {
          parts.push(item.previousBlocks.map(b => `前文脈: ${b}`).join('\n'));
        }
        parts.push(`内容: ${item.content}`);
        if (item.followingBlocks?.length) {
          parts.push(item.followingBlocks.map(b => `後文脈: ${b}`).join('\n'));
        }
        return parts.join('\n');
      })
      .join('\n\n');

    return { contentToUpdate, context };
  }, {
    timeout: TRANSACTION_TIMEOUT,
    maxWait: TRANSACTION_TIMEOUT
  });

  const apiMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `以下の関連情報を参照して回答してください：
参照情報： ${context}
ユーザーの質問「${messages[messages.length - 1].content}」に対して、上記の情報を参考に適切な回答を提供してください。`
    },
    ...messages.map(({ role, content }) => ({ role, content }))
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: apiMessages,
    stream: true
  });

  return OpenAIStream(response);
}