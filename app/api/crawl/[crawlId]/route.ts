import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { syncUser } from "@/lib/syncUser";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ crawlId: string }> }
) {
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

    const { crawlId } = await params;

    // Fetch crawl with project to verify ownership
    const crawl = await prisma.crawl.findFirst({
      where: {
        id: crawlId,
        project: {
          userId: user.id,
        },
      },
      include: {
        project: true,
      },
    });

    if (!crawl) {
      return NextResponse.json({ error: "Crawl not found" }, { status: 404 });
    }

    return NextResponse.json(crawl);
  } catch (error: any) {
    console.error("Error fetching crawl:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
