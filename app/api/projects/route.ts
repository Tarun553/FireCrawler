import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { syncUser } from "@/lib/syncUser";
import { z } from "zod";
import crypto from "crypto";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  websiteUrl: z.string().url("Valid URL is required"),
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
    const validation = createProjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, websiteUrl } = validation.data;

    // Generate unique keys
    const publicKey = `pk_${crypto.randomBytes(16).toString("hex")}`;
    const pineconeNamespace = `project_${crypto.randomBytes(8).toString("hex")}`;

    // Create project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name,
        websiteUrl,
        publicKey,
        pineconeNamespace,
        status: "CREATING",
      },
    });

    return NextResponse.json({ ...project, crawls: [] }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
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

    // Get all projects for user
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: {
        crawls: {
          orderBy: { createdAt: "desc" },
          take: 1, // Latest crawl
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
