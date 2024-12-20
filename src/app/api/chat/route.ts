import { getEmbedding } from '@/app/utils/embeddings';
import { type ConvertibleMessage } from '@/app/utils/types';
import { Pinecone } from '@pinecone-database/pinecone';
import { Ollama } from 'ollama';

interface RequestBody {
  messages: ConvertibleMessage[];
}

export async function POST(req: Request): Promise<Response> {
  try {
    console.log("Welcome to AI");

    // Parse the request JSON with explicit typing
    const body = await req.json() as RequestBody;

    if (!body.messages || body.messages.length === 0) {
      throw new Error('No messages provided');
    }

    const lastMessage = body.messages[body.messages.length - 1];
    if (!lastMessage?.content) {
      throw new Error('No valid last message found');
    }

    const query = lastMessage.content.trim();
    console.log("Query:", query);

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY ?? "",
    });

    // Get embeddings for the query
    const queryEmbedding = await getEmbedding(query);
    console.log("Query Embedding:", queryEmbedding);

    // Query Pinecone
    const index = pinecone.index('dwm');
    if (!index) {
      throw new Error('Pinecone index "dwm" not found');
    }

    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    console.log("Pinecone Query Response:", JSON.stringify(queryResponse, null, 2));

    const context = queryResponse.matches
      .map((match) => `Book: ${String(match.metadata?.book ?? 'Unknown')}\nPage: ${String(match.metadata?.page_number ?? 'Unknown')}\nText: ${String(match.metadata?.text ?? '')}`)
      .join('\n\n');




    console.log("Context:", context);

    const final_prompt = `
      Context: ${context}\n
      Query: ${query}\n
      Answer the given question based on the context provided in detail. Marks allocted for this question 10 marks and Cite the book name at the end of quries.
    `;

    console.log("Final Prompt:", final_prompt);

    const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

    const result = await ollama.generate({
      model: 'llama3.2',
      prompt: final_prompt,
    });

    console.log("Ollama Response:", result);
    // return result.toDataStreamResponse();
    return new Response(JSON.stringify({ content: result.response }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error: unknown) {
    console.error('Error in API route:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
