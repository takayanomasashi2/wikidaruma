// app/api/chat/route.ts
import { PrismaClient } from '@prisma/client';
import { getEmbedding } from '@/utils/embedding';
import { OpenAI } from 'openai';
import { StreamingTextResponse, experimental_StreamData, OpenAIStream } from 'ai';

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

interface ChatResult {
 contentToUpdate: ContentWithContext[];
 context: string;
}

export async function POST(req: Request) {
 try {
   const { message, userId } = await req.json();
   
   if (!message || !userId) {
     return new Response('Message and userId are required', { status: 400 });
   }

   const result = await prisma.$transaction(async (tx) => {
     const queryEmbedding = await getEmbedding(message);

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
       const keywords = message.replace(/[はがのにをでやへと。、？！]/g, ' ').split(' ').filter(w => w.length > 0);
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

     for (const content of contentToUpdate) {
       await tx.$executeRaw`
        UPDATE "Block"
        SET 
          "useCount" = "useCount" + 1,
          "avgSimilarity" = ("avgSimilarity" * "useCount" + ${content.similarity}) / ("useCount" + 1)
        WHERE content = ${content.content}
      `;
     }

     return { contentToUpdate: enhancedContent, context } as ChatResult;
   });

   const messages = [
     {
       role: 'system' as const,
       content: `以下の関連情報を参照して回答してください：
参照情報： ${result.context}
ユーザーの質問「${message}」に対して、上記の情報を参考に適切な回答を提供してください。存在する情報のみを使用し、情報が不足している場合はその旨を伝えてください。`
     },
     {
       role: 'user' as const,
       content: message
     }
   ];

   const response = await openai.chat.completions.create({
     model: 'gpt-4',
     messages,
     stream: true
   });

   const data = new experimental_StreamData();
   const stream = OpenAIStream(response, {
     onCompletion: (completion) => {
       data.close();
     },
     experimental_streamData: true,
   });

   return new StreamingTextResponse(stream, {
     headers: { 'Content-Type': 'text/event-stream' }
   });

 } catch (error) {
   console.error('Chat error:', error);
   return new Response(JSON.stringify({ error: 'Failed to process chat' }), { status: 500 });
 } finally {
   await prisma.$disconnect();
 }
}