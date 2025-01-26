// api/chat/route.ts
import { PrismaClient } from '@prisma/client';
import { getEmbedding } from '@/utils/embedding';
import { OpenAI } from 'openai';
import { StreamingTextResponse, experimental_StreamData, OpenAIStream } from 'ai';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// POST handler
export async function POST(req: Request) {
  try {
    const { messages, userId }: { messages: Message[]; userId: string } = await req.json();

    const stream = await processChat(messages, userId);

    return new StreamingTextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process chat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


// GETリクエスト処理
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const message = url.searchParams.get('message');
    const userId = url.searchParams.get('userId');

    if (!message || !userId) {
      return new Response(JSON.stringify({ error: 'Missing message or userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const messages: Message[] = [
      {
        role: 'user',
        content: message,
        userId: userId,
      }
    ];

    const stream = await processChat(messages, userId);


    return new StreamingTextResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream' }
    });

  } catch (error) {
    console.error('Chat error (GET):', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
}

// processChat内の修正（PrismaクエリとOpenAIレスポンスのログ）
async function processChat(messages: Message[], userId: string) {

  if (!messages || messages.length === 0) {
    throw new Error('No messages provided');
  }

  const lastMessage = messages[messages.length - 1];

  const result = await prisma.$transaction(async (tx) => {
    const queryEmbedding = await getEmbedding(lastMessage.content);

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

    if (similarContents.length === 0) {
      // Similar content fallback logic
      const keywords = lastMessage.content.replace(/[はがのにをでやへと。、？！]/g, ' ').split(' ').filter(w => w.length > 0);
      if (keywords.length > 0) {
        const keywordResults = await tx.block.findMany({
          where: {
            OR: keywords.map(keyword => ({
              content: { contains: keyword }
            })),
            page: {
              userId: userId
            }
          },
          select: {
            content: true,
            pageId: true,
            order: true
          },
          take: 5
        });

        contentToUpdate = keywordResults.map(item => ({
          content: item.content,
          similarity: 0.3,
          pageId: item.pageId,
          order: item.order
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

    const context = enhancedContent.map(item => {
      let blockContext = '';
      if (item.previousBlocks?.length) {
        blockContext += item.previousBlocks.map(b => `前文脈: ${b}`).join('\n') + '\n';
      }
      blockContext += `内容: ${item.content}`;
      if (item.followingBlocks?.length) {
        blockContext += '\n' + item.followingBlocks.map(b => `後文脈: ${b}`).join('\n');
      }
      return blockContext;
    }).join('\n\n');

    // Return both contentToUpdate and context
    return { contentToUpdate, context };
  });

  const apiMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `以下の関連情報を参照して回答してください：
参照情報： ${result.context}
ユーザーの質問「${messages[messages.length - 1].content}」に対して、上記の情報を参考に適切な回答を提供してください。`
    },
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: apiMessages,
    stream: true
  });

  const stream = OpenAIStream(response);
  return stream;
}

