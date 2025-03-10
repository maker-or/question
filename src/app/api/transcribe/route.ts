import { NextRequest, NextResponse } from 'next/server';
import OpenAI from "openai";
import fs from "fs";
import path from 'path';
import { tmpdir } from 'os';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // Check for OpenAI API key instead of Groq
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not set' }, { status: 500 });
    }
    console.log("in the transcribe route");
    // Get audio file from request
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    // const fileStream = audioFile.stream();
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert File to buffer and save to temporary file
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a temporary file path
    const tempFilePath = path.join(tmpdir(), `recording-${Date.now()}.wav`);
    
    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, buffer);
    
    // Create read stream from the temporary file
    const fileStream = fs.createReadStream(tempFilePath);

    // Call Whisper API through OpenAI directly (not Groq)

    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    });
    
    const response = await openai.audio.transcriptions.create({
      model: 'whisper-large-v3',
      file: fileStream
    });
    console.log("file is proccesed")
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary file:', cleanupError);
    }

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
