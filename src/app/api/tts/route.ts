// import { createOpenAI } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';
import OpenAI from "openai";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    if (!process.env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY is not set' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { text } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Groq client
    // const groq = createOpenAI({
    //   baseURL: 'https://api.groq.com/openai/v1',
    //   apiKey: process.env.GROQ_API_KEY,
    // });

    // Call TTS API to generate speech
    // const openai = new OpenAI();
    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    });
  
    const response =  openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // You can choose different voices: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
      input: text.substring(0, 4000), // TTS usually has character limits, so truncate if needed
    });

    // Get audio data
    const audioBuffer = Buffer.from(await (await response).arrayBuffer());

    // Return the audio data
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      }
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
