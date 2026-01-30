import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embeddingModel, chatModel } from "@/lib/gemini";
import { pineconeIndex } from "@/lib/pinecone";
import { z } from "zod";

const chatSchema = z.object({
  publicKey: z.string().min(1, "Public key is required"),
  message: z.string().min(1, "Message is required"),
});

export async function POST(req: NextRequest) {
  // Add CORS headers to allow widget to work on any domain
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    // Parse and validate request body
    const body = await req.json();
    const validation = chatSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400, headers: corsHeaders }
      );
    }

    const { publicKey, message } = validation.data;

    // Find project by public key
    const project = await prisma.project.findUnique({
      where: { publicKey },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Invalid public key" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (project.status !== "READY") {
      return NextResponse.json(
        { error: "Project is not ready yet. Please wait for crawling to complete." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate embedding for the user's message
    const embeddingResult = await embeddingModel.embedContent(message);
    const queryEmbedding = embeddingResult.embedding.values;

    // Query Pinecone for relevant context
    const namespace = pineconeIndex.namespace(project.pineconeNamespace);
    const queryResponse = await namespace.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    // Extract context from matches
    const contexts = queryResponse.matches
      .map((match) => match.metadata?.content)
      .filter(Boolean)
      .join("\n\n");

    if (!contexts) {
      return NextResponse.json(
        {
          reply: "I don't have enough information to answer that question. The website might not have been crawled yet or doesn't contain relevant information.",
        },
        { headers: corsHeaders }
      );
    }

    // Build prompt for Gemini
    const prompt = `You are a helpful chatbot assistant for the website: ${project.websiteUrl}.

Use the following context from the website to answer the user's question. If the context doesn't contain the answer, politely say you don't know.

Context:
${contexts}

User question: ${message}

Answer:`;

    // Generate response using Gemini
    const result = await chatModel.generateContent(prompt);
    const reply = result.response.text();

    return NextResponse.json({ reply }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Error processing chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
