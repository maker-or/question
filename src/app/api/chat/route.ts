// import { createOpenAI } from '@ai-sdk/openai';
//import Groq from "groq-sdk"; // Ensure this package is installed
import { streamText ,generateText,wrapLanguageModel, extractReasoningMiddleware} from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { Pinecone } from '@pinecone-database/pinecone';
import { getEmbedding } from '../../../../utils/embeddings';
import { type ConvertibleMessage } from '../../../../utils/types';
import { DuckDuckGoSearch } from '@langchain/community/tools/duckduckgo_search';


// Define a type for the expected request body structure
interface RequestBody {
  messages: ConvertibleMessage[];
  model: string;
  experimental_attachments?: string[];
  voiceMode?: boolean; // Flag to indicate if this is a voice interaction
}

export async function POST(req: Request): Promise<Response> {


  
  try {
    console.log('Welcome to AI');
    
    // Check if environment variables are properly set
    if (!process.env.GROQ_API_KEY || !process.env.OPENROUTE_API_KEY || !process.env.PINECONE_API_KEY) {
      console.error('Missing required API keys in environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error - missing API keys' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const body = await req.json() as RequestBody;
    
    console.log("Request body received:", JSON.stringify(body).substring(0, 200) + "...");
    const selectedModel = body.model || "google/gemini-2.0-pro-exp-02-05:free";
    const isVoiceMode = body.voiceMode || false;

    if (!body.messages || body.messages.length === 0) {
      throw new Error('No messages provided');
    }

    const lastMessage = body.messages[body.messages.length - 1];
    if (!lastMessage?.content) {
      throw new Error('No valid last message found');
    }

    const query = lastMessage.content;
    console.log('Query:', query);

    // NEW: Compute conversation context from previous messages, if any
    const conversationContext = body.messages.length > 1 
      ? `Previous conversation:\n${body.messages.slice(0, -1).map(msg => msg.content).join('\n\n')}\n`
      : '';

    // NEW: Check for attachments
    const attachments = body.experimental_attachments || [];
    if (attachments.length > 0) {
      // Process the attachments
      attachments.forEach((attachment) => {
        // Example: Log the attachment data
        console.log("yes it exists")
        console.log('Attachment:', attachment);
        // You can handle the attachment as needed (e.g., save it, process it, etc.)
      });
    }
    else{console.log("no attachments found")}

    // First, let's ask the LLM to decide whether to use RAG or not
    // const groq = createOpenAI({
    //   baseURL: 'https://api.groq.com/openai/v1',
    //   apiKey: process.env.GROQ_API_KEY,
    // });

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTE_API_KEY,
    });

    // Test the API keys before proceeding
    try {
      console.log("Testing API connections...");
      
      const decisionPrompt = `
        Analyze this query: "${query}"
        Should I use RAG (retrieval from knowledge base) or answer from general knowledge?
        If the query is related to studies, exams, or educational content only theroy question respond with "USE_RAG".
        If it's a general conversation or question, or a problem or numerical related to math,physics,chemistry or biology respond with "USE_GENERAL".
        Respond with only one of these two options.
      `;

      const decision = await generateText({
        model: openrouter('meta-llama/llama-3.3-70b-instruct:free'),
        //model: groq('llama-3.3-70b-versatile'),
        prompt: decisionPrompt,
        temperature: 0,
      });

      console.log("Decision prompt completed successfully");
      
      const a = decision.text;
      console.log("Decision result:", a);
      const useRag = a.includes("USE_RAG");
      console.log("Using RAG:", useRag);
      let finalPrompt = '';

      if (useRag) {
        // Initialize Pinecone and perform RAG
        const pinecone = new Pinecone({
          apiKey: process.env.PINECONE_API_KEY,
        });

        const sub = `
You are a query classifier. Your task is to categorize a given query into one of the following subjects and return only the corresponding subject tag. Do not include any other text,symbols or information in your response even the new line.

The possible subject categories and their tags are:

*   Compiler Design: cd
*   Data Analysis and Algorithms: daa
*   Data Communication and Networking/CRYPTOGRAPHY AND NETWORK SECURITY: ol
*   Engineering Economics and Management: eem
*   Chemistry : chemistry

Analyze the following query: "${query}" and return the appropriate tag.
        `;

        const i = await generateText({
          model: openrouter('meta-llama/llama-3.3-70b-instruct:free'),
          prompt: sub,
          temperature: 0,
        });

        console.log("Subject classification result:", i.text);
        const queryEmbedding = await getEmbedding(query);
        
        // Check if Pinecone index exists before querying
        try {
          const index = pinecone.index(i.text);
          const queryResponse = await index.namespace('').query({
            vector: queryEmbedding,
            topK: 5,
            includeMetadata: true,
          });

          const searchTool = new DuckDuckGoSearch();
          const searchResults = (await searchTool.invoke(query)) as string;
          console.log("^^^^^^^^^^^^^^")
          console.log(searchResults)
          console.log("^^^^^^^^^^^^^^")

          if (!queryResponse.matches || queryResponse.matches.length === 0) {
            console.log("No matches found in Pinecone, falling back to general knowledge");
            finalPrompt = `
              ${conversationContext}
              Question: ${query}
              keep the response friendly tone and short
            `;
          } else {
            const context = queryResponse.matches
              .map((match) => `Book: ${String(match.metadata?.book ?? 'Unknown')}\nPage: ${String(match.metadata?.page_number ?? 'Unknown')}\nText: ${String(match.metadata?.text ?? '')}`)
              .join('\n\n');

            finalPrompt = `
              ${conversationContext}
              Context: ${context}
              Web Context : ${searchResults}
              Question: ${query}
              Please provide a comprehensive and detailed answer based on the provided context and cite the book name at the end of the response.
              ${isVoiceMode ? 'Since the user is in voice mode, make your response concise and natural for speech.' : ''}
            `;
          }
        } catch (pineconeError) {
          console.error("Pinecone error:", pineconeError);
          finalPrompt = `
            ${conversationContext}
            Question: ${query}
            keep the response friendly tone and short
          `;
        }
      } else {
        // Use general knowledge
        finalPrompt = `
          ${conversationContext}
          Question: ${query}
          keep the response friendly tone and short
          ${isVoiceMode ? 'Since the user is in voice mode, make your response concise and natural for speech.' : ''}
        `;
      }
      const model = wrapLanguageModel({
        model: openrouter(selectedModel),
        middleware: extractReasoningMiddleware({ tagName: 'think' }),
      });
      // Generate the response using OpenRouter
      try {
        console.log("Generating final response with model:", selectedModel);
        const result = streamText({
          model: model,
          
          system: `
            You are an expert exam assistant named SphereAI designed to provide accurate, detailed, and structured answers to user queries help them to prepare for their exams.  Follow these guidelines:
        
            1. **Role**: Act as a knowledgeable and helpful assistant don't show the thinking process. just provide the answer. you will be provided with the context from the web and knowledge base to answer the user query.
            2. **Task**: Answer user questions indetail and explain it clearly answer each question for 15 marks .
            3. **Output Format**:
               - Start with a indetailed explation of the answer.
               - Use markdown formatting for headings and bullet points.
               - Use bullet points for sub-points.
               - Use headings for sections and sub-headings for sub-points.
               - Use sub-headings for even more detailed explanations.
               - Use paragraphs for detailed explanations.
               -don't provide any model name
               write a summary
               - Use headings and bullet points for clarity.
               - Provide step-by-step explanations where applicable.
               - Keep paragraphs short and easy to read.
               -After each paragraph you write, leave an empty line (a blank line) to improve readability and ensure the text is visually organized.
            5. **Tone and Style**:
               - Use a professional and friendly tone.
               - Avoid overly technical jargon unless requested.
               ${isVoiceMode ? '- Since the user is in voice mode, make your responses more conversational and suitable for listening.' : ''}
            6. **Error Handling**:
               - If the query is unclear, ask for clarification before answering.
            7. **Citations**:
               - Always cite the source of your information at the end of your response, if applicable.
               - show the citations from the web Context
            8. **Question Generation**:
               - if the user requests you to generate a question, create only a thought-provoking and contextually appropriate question without providing any answers.
          `,
          prompt: finalPrompt,
          // providerOptions: {
          //   google: { responseModalities: ['TEXT', 'IMAGE'] },
          // },
        
        });

        return result.toDataStreamResponse();
      } catch (error) {
        console.error('Error during streamText:', error);
        return new Response(
          JSON.stringify({ error: 'An error occurred while generating the response', details: error instanceof Error ? error.message : 'Unknown error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (apiTestError) {
      console.error('API connection test failed:', apiTestError);
      return new Response(
        JSON.stringify({ error: 'Failed to connect to AI services', details: apiTestError instanceof Error ? apiTestError.message : 'Unknown error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: unknown) {
    console.error('Error in chat route:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
