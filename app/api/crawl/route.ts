import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { syncUser } from "@/lib/syncUser";
import { crawlQueue } from "@/lib/queue";
import { z } from "zod";

const crawlSchema = z.object({
  projectId: z.string().uuid("Valid project ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sync user to database
    const user = await syncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = crawlSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { projectId } = validation.data;

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user?.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create crawl record
    const crawl = await prisma.crawl.create({
      data: {
        projectId: project.id,
        status: "PENDING",
      },
    });

    // Add job to queue
    await crawlQueue.add("crawl-job", {
      crawlId: crawl.id,
      projectId: project.id,
      websiteUrl: project.websiteUrl,
      pineconeNamespace: project.pineconeNamespace,
    });

    return NextResponse.json(crawl, { status: 201 });
    
  } catch (error: Error | unknown) {
    console.error("Error starting crawl:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
