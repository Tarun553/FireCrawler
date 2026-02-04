
// import { NextRequest, NextResponse } from "next/server";
// import { pineconeIndex } from "@/lib/pinecone";
// import { embeddingModel, chatModel } from "@/lib/gemini";
// import { prisma } from "@/lib/prisma";

// // --- Types ---

// type ToolResponse = {
//   results?: {
//     toolCallId: string;
//     result: string;
//   }[];
//   result?: string; // For direct API request tools
//   error?: string;
// };

// // --- Helper Functions ---

// async function getEmbeddings(text: string) {
//   const result = await embeddingModel.embedContent(text);
//   return result.embedding.values;
// }

// // Updated to support namespace filtering
// async function processRAGRequest(question: string, publicKey?: string): Promise<string> {
//   // 1. Resolve Project/Namespace if publicKey is provided
//   let namespace = pineconeIndex; 
//   let projectInfo = "";

//   if (publicKey) {
//       const project = await prisma.project.findUnique({
//           where: { publicKey }
//       });

//       if (!project) {
//           return "Error: Invalid Public Key provided. Cannot access knowledge base.";
//       }
      
//       // Target specific namespace
//       // @ts-ignore - Pinecone SDK types can be tricky with .namespace() depending on version, enforcing dynamic check
//       if (project.pineconeNamespace) {
//         namespace = pineconeIndex.namespace(project.pineconeNamespace) as any;
//       }
//       projectInfo = ` for ${project.websiteUrl}`;
//   } else {
//       // If no key provided, we could fail or search default.
//       // For strict multi-tenant, we should probably fail, but for now let's warn.
//       console.warn("No publicKey provided, searching global index (might yield mixed results).");
//   }

//   // 2. Embed the question
//   const vector = await getEmbeddings(question);

//   // 3. Query Pinecone (Namespace aware)
//   const queryResponse = await namespace.query({
//     vector,
//     topK: 5,
//     includeMetadata: true,
//   });
  
//   const matches = queryResponse.matches || [];

//   // 4. Construct Context
//   const contextText = matches
//     .map((m: any) => m.metadata?.text || m.metadata?.content || "")
//     .filter(Boolean)
//     .join("\n\n");

//   if (!contextText) {
//     return `I'm sorry, I couldn't find any relevant information${projectInfo}.`;
//   }

//   // 5. Generate Answer with Gemini
//   const systemPrompt = `You are a helpful assistant${projectInfo}. Use the following context to answer the user's question clearly and concisely.

//   Context:
//   ${contextText}

//   User Question: ${question}
//   `;

//   const result = await chatModel.generateContent(systemPrompt);
//   return result.response.text();
// }

// // --- Main API Handler ---

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     console.log("--------------- VAPI REQUEST START ---------------");
//     console.log("Timestamp:", new Date().toISOString());
//     console.log("Incoming Body:", JSON.stringify(body, null, 2));

//     // Normalize 'question' vs 'questions'
//     // Vapi sometimes parses user speech into 'questions' key depending on prompt/model.
//     const questionInput = body.question || body.questions;
//     const publicKeyInput = body.publicKey; // We expect this from Vapi config now

//     // 1. Check for Direct "API Request" Payload
//     if (questionInput && !body.message) {
//       console.log("Pattern matched: Direct question payload");
//       console.log(`Question: ${questionInput}, PublicKey: ${publicKeyInput}`);

//       try {
//           const answer = await processRAGRequest(questionInput, publicKeyInput);
//           console.log("Sending Direct Response:", answer);
//           return NextResponse.json({ result: answer });
//       } catch (err) {
//           console.error("Error in Direct RAG processing:", err);
//           return NextResponse.json({ error: "RAG processing failed" }, { status: 500 });
//       }
//     }

//     // 2. Check for Standard "Tool Call" Payload
//     const toolCalls = body.message?.toolCalls;

//     if (toolCalls && toolCalls.length > 0) {
//       console.log(`Pattern matched: Tool Calls (Count: ${toolCalls.length})`);
//       const results = [];

//       for (const call of toolCalls) {
//         console.log(`Processing Tool Call ID: ${call.id}, Name: ${call.function.name}`);
        
//         if (call.function.name === "askFirecrawl" || call.function.name === "ask_firecrawl") { 
          
//           let args = call.function.arguments;

//           if (typeof args === 'string') {
//              try {
//                 args = JSON.parse(args); 
//              } catch (e) {
//                 console.error("Failed to parse arguments JSON:", args);
//                 results.push({ toolCallId: call.id, result: "Error parsing arguments" });
//                 continue;
//              }
//           }

//           // Handle args
//           const q = args.question || args.questions;
//           // Vapi might convert snake/camel case, check both
//           const pk = args.publicKey || args.public_key || publicKeyInput; 

//           console.log("Extracted Question:", q);
//           console.log("Extracted PublicKey:", pk);

//           if (!q) {
//             console.warn("No 'question' field found in arguments");
//             results.push({
//               toolCallId: call.id,
//               result: "Error: No question provided.",
//             });
//             continue;
//           }

//           try {
//               const answer = await processRAGRequest(q, pk);
//               // Limit log length
//               console.log("Generated RAG Answer:", answer.length > 50 ? answer.substring(0, 50) + "..." : answer);
//               results.push({
//                 toolCallId: call.id,
//                 result: answer,
//               });
//           } catch (err) {
//               console.error("Error during RAG execution for tool call:", err);
//               results.push({
//                   toolCallId: call.id,
//                   result: "I encountered an error while searching the knowledge base.",
//               });
//           }
//         } else {
//             console.log("Unknown tool function name:", call.function.name);
//         }
//       }

//       console.log("Returning Tool Results:", JSON.stringify({ results }));
//       return NextResponse.json({ results });
//     }

//     // 3. Fallback
//     console.log("No valid payload pattern matched. Returning 200 OK status.");
//     return NextResponse.json({ status: "ok", message: "No valid tool payload found" });

//   } catch (error) {
//     console.error("CRITICAL API ERROR:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }
// app/api/vapi/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import "dotenv/config";

import { pineconeIndex } from "@/lib/pinecone";
import { embeddingModel, chatModel } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

// --------------------
// Types
// --------------------

type VapiBody = {
  // Direct payload (API request tool)
  question?: string;
  questions?: string;
  publicKey?: string;

  // Tool-call payload
  message?: {
    toolCalls?: Array<{
      id: string;
      function: {
        name: string;
        arguments: unknown; // stringified JSON or object
      };
    }>;
  };
};

type ToolResultsResponse = {
  results: Array<{ toolCallId: string; result: string }>;
};

type DirectResponse = { result: string };
type ErrorResponse = { error: string };

// --------------------
// Utils
// --------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeJsonParse(input: unknown): any {
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }
  return typeof input === "object" && input !== null ? input : null;
}

function isRetryableGeminiError(err: unknown): boolean {
  const status =
    typeof err === "object" && err && "status" in err ? (err as any).status : undefined;
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function embedWithRetry(text: string): Promise<number[]> {
  const maxRetries = 6;
  const baseDelayMs = 500;
  const maxDelayMs = 8000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await embeddingModel.embedContent(text);
      const values: number[] | undefined = result?.embedding?.values;

      if (!values || !Array.isArray(values)) throw new Error("Missing embedding.values");
      if (values.length !== 768) throw new Error(`Bad embedding size: ${values.length} (expected 768)`);

      return values;
    } catch (err) {
      if (attempt === maxRetries || !isRetryableGeminiError(err)) throw err;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      await sleep(backoff + jitter);
    }
  }

  throw new Error("embedWithRetry failed unexpectedly");
}

/**
 * Remove markdown artifacts that cause listy/heading responses.
 * Keeps content, removes most formatting noise.
 */
function cleanContext(text: string) {
  return text
    .replace(/^#{1,6}\s+/gm, "") // remove headings like ### Title
    .replace(/`{3}[\s\S]*?`{3}/g, "") // remove fenced code blocks
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // remove images
    .replace(/\[[^\]]*\]\(([^)]+)\)/g, "$1") // replace markdown links with URL
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeAuthOrBoilerplate(url: string, text: string) {
  const u = url.toLowerCase();
  const t = text.toLowerCase();

  // Skip login/signup/checkout pages and boilerplate UI text
  if (u.includes("sign-in") || u.includes("sign-up") || u.includes("login") || u.includes("register"))
    return true;

  if (
    t.includes("create your account") ||
    t.includes("secured by") ||
    t.includes("development mode") ||
    t.includes("email address") ||
    t.includes("password")
  ) {
    return true;
  }

  return false;
}

function buildConcisePrompt(projectInfo: string, contextText: string, question: string) {
  return `
You are a helpful voice assistant${projectInfo}.
Use ONLY the provided context. If the answer is not in the context, say: "I don't have that information."

Rules:
- Max 2 short sentences.
- No headings, no bullet points, no pricing tables unless asked.
- Speak naturally and directly.

Context:
${contextText}

Question: ${question}
`.trim();
}

// --------------------
// RAG
// --------------------

async function processRAGRequest(question: string, publicKey?: string): Promise<string> {
  if (!publicKey) {
    return "Missing public key. Please provide a valid public key.";
  }

  const project = await prisma.project.findUnique({
    where: { publicKey },
    select: { id: true, websiteUrl: true, pineconeNamespace: true },
  });

  if (!project) return "Invalid public key. I can't access that knowledge base.";

  const projectInfo = project.websiteUrl ? ` for ${project.websiteUrl}` : "";

  // Namespace
  const namespaceClient = project.pineconeNamespace
    ? (pineconeIndex as any).namespace(project.pineconeNamespace)
    : (pineconeIndex as any);

  // Embed query
  const vector = await embedWithRetry(question);

  // Query Pinecone (IMPORTANT: filter by projectId to avoid cross-tenant mixing)
  const queryResponse = await namespaceClient.query({
    vector,
    topK: 10,
    includeMetadata: true,
    filter: { projectId: project.id },
  });

  const matches = queryResponse?.matches ?? [];

  // Dedupe by content hash + remove noisy pages
  const seen = new Set<string>();
  const chunks: string[] = [];

  for (const m of matches) {
    const md = m?.metadata ?? {};
    const url = String(md.url || md.sourceURL || "");
    const raw = String(md.text || md.content || "");

    if (!raw) continue;
    if (looksLikeAuthOrBoilerplate(url, raw)) continue;

    const cleaned = cleanContext(raw);
    if (!cleaned) continue;

    const hash = crypto.createHash("sha1").update(cleaned).digest("hex");
    if (seen.has(hash)) continue;
    seen.add(hash);

    chunks.push(cleaned);

    // stop early if enough context
    if (chunks.join("\n\n---\n\n").length > 4500) break;
  }

  const contextText = chunks.join("\n\n---\n\n").slice(0, 4500);

  if (!contextText) {
    return `I don't have that information${projectInfo}.`;
  }

  const prompt = buildConcisePrompt(projectInfo, contextText, question);
  const result = await chatModel.generateContent(prompt);
  const answer = result?.response?.text?.() ?? "";

  // final clamp to keep voice answers short
  const final = answer.replace(/\s+/g, " ").trim();
  return final.length > 240 ? final.slice(0, 240).trim() : final;
}

// --------------------
// Handler
// --------------------

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VapiBody;

    // Direct payload
    const directQuestion = normalizeText(body.question ?? body.questions);
    const publicKey = normalizeText(body.publicKey);

    if (directQuestion && !body.message) {
      const answer = await processRAGRequest(directQuestion, publicKey || undefined);
      return NextResponse.json<DirectResponse>({ result: answer });
    }

    // Tool calls
    const toolCalls = body.message?.toolCalls ?? [];
    if (toolCalls.length > 0) {
      const results: ToolResultsResponse["results"] = [];

      for (const call of toolCalls) {
        const name = call.function?.name ?? "";
        const isOurTool = name === "askFirecrawl" || name === "ask_firecrawl";
        if (!isOurTool) continue;

        const args = safeJsonParse(call.function?.arguments) || {};
        const q = normalizeText(args.question ?? args.questions);
        const pk = normalizeText(args.publicKey ?? args.public_key ?? body.publicKey);

        if (!q) {
          results.push({ toolCallId: call.id, result: "Please ask a question." });
          continue;
        }

        try {
          const answer = await processRAGRequest(q, pk || undefined);
          results.push({ toolCallId: call.id, result: answer });
        } catch (err) {
          console.error("RAG tool error:", err);
          results.push({
            toolCallId: call.id,
            result: "I hit an error while searching the knowledge base. Please try again.",
          });
        }
      }

      return NextResponse.json<ToolResultsResponse>({ results });
    }

    return NextResponse.json({ status: "ok", message: "No valid Vapi payload found" });
  } catch (error) {
    console.error("CRITICAL API ERROR:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal Server Error" }, { status: 500 });
  }
}
