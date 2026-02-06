import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { chatModel } from "@/lib/gemini";
import { z } from "zod";

const querySchema = z.object({
  projectId: z.string().uuid("Valid project ID is required"),
});

const ONE_HOUR_MS = 60 * 60 * 1000;

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
};

const buildFallbackInsight = ({
  bounceRateChange,
  loadTimeChange,
  visitorsChange,
}: {
  bounceRateChange: number;
  loadTimeChange: number;
  visitorsChange: number;
}) => {
  if (bounceRateChange > 10 && loadTimeChange > 10) {
    return "Your bounce rate increased alongside slower page loads. Consider optimizing performance to retain visitors.";
  }
  if (visitorsChange > 10) {
    return "Traffic is trending up over the last 24 hours. Consider highlighting key conversion paths to capitalize on growth.";
  }
  if (visitorsChange < -10) {
    return "Traffic dipped compared to the previous day. Review acquisition channels and recent content changes.";
  }
  return "Traffic and engagement appear steady. Keep monitoring for emerging trends.";
};

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const validation = querySchema.safeParse({
      projectId: searchParams.get("projectId"),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { projectId } = validation.data;

    const project = await prisma.project.findFirst({
      where: { id: projectId, user: { clerkId } },
      select: { id: true, websiteUrl: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const now = new Date();
    const currentStart = new Date(now.getTime() - 24 * ONE_HOUR_MS);
    const previousStart = new Date(now.getTime() - 48 * ONE_HOUR_MS);

    const [currentSessions, previousSessions] = await Promise.all([
      prisma.analyticsSession.count({
        where: {
          projectId: project.id,
          lastSeenAt: { gte: currentStart },
        },
      }),
      prisma.analyticsSession.count({
        where: {
          projectId: project.id,
          lastSeenAt: { gte: previousStart, lt: currentStart },
        },
      }),
    ]);

    const [currentPageviews, previousPageviews, currentClicks, previousClicks] =
      await Promise.all([
        prisma.analyticsEvent.count({
          where: {
            projectId: project.id,
            eventType: "PAGEVIEW",
            createdAt: { gte: currentStart },
          },
        }),
        prisma.analyticsEvent.count({
          where: {
            projectId: project.id,
            eventType: "PAGEVIEW",
            createdAt: { gte: previousStart, lt: currentStart },
          },
        }),
        prisma.analyticsEvent.count({
          where: {
            projectId: project.id,
            eventType: "CLICK",
            createdAt: { gte: currentStart },
          },
        }),
        prisma.analyticsEvent.count({
          where: {
            projectId: project.id,
            eventType: "CLICK",
            createdAt: { gte: previousStart, lt: currentStart },
          },
        }),
      ]);

    const [currentLoadTime, previousLoadTime] = await Promise.all([
      prisma.analyticsEvent.aggregate({
        where: {
          projectId: project.id,
          eventType: "PAGEVIEW",
          loadTimeMs: { not: null },
          createdAt: { gte: currentStart },
        },
        _avg: { loadTimeMs: true },
      }),
      prisma.analyticsEvent.aggregate({
        where: {
          projectId: project.id,
          eventType: "PAGEVIEW",
          loadTimeMs: { not: null },
          createdAt: { gte: previousStart, lt: currentStart },
        },
        _avg: { loadTimeMs: true },
      }),
    ]);

    const [currentPageviewGroups, previousPageviewGroups] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ["sessionId"],
        where: {
          projectId: project.id,
          eventType: "PAGEVIEW",
          createdAt: { gte: currentStart },
        },
        _count: { _all: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["sessionId"],
        where: {
          projectId: project.id,
          eventType: "PAGEVIEW",
          createdAt: { gte: previousStart, lt: currentStart },
        },
        _count: { _all: true },
      }),
    ]);

    const currentBounceCount = currentPageviewGroups.filter(
      (group) => group._count._all <= 1,
    ).length;
    const previousBounceCount = previousPageviewGroups.filter(
      (group) => group._count._all <= 1,
    ).length;

    const currentBounceRate =
      currentSessions === 0 ? 0 : currentBounceCount / currentSessions;
    const previousBounceRate =
      previousSessions === 0 ? 0 : previousBounceCount / previousSessions;

    const visitorsChange = percentageChange(currentSessions, previousSessions);
    const pageviewsChange = percentageChange(
      currentPageviews,
      previousPageviews,
    );
    const clicksChange = percentageChange(currentClicks, previousClicks);
    const bounceRateChange =
      previousBounceRate === 0
        ? currentBounceRate === 0
          ? 0
          : 100
        : ((currentBounceRate - previousBounceRate) / previousBounceRate) * 100;
    const currentLoadTimeMs = currentLoadTime._avg.loadTimeMs
      ? Math.round(currentLoadTime._avg.loadTimeMs)
      : null;
    const previousLoadTimeMs = previousLoadTime._avg.loadTimeMs
      ? Math.round(previousLoadTime._avg.loadTimeMs)
      : null;
    const loadTimeChange =
      currentLoadTimeMs !== null && previousLoadTimeMs !== null
        ? percentageChange(currentLoadTimeMs, previousLoadTimeMs)
        : 0;

    let insight = buildFallbackInsight({
      bounceRateChange,
      loadTimeChange,
      visitorsChange,
    });

    try {
      const prompt = `You are a web analytics assistant for ${project.websiteUrl}.
Summarize one concise insight based on these 24h metrics vs the previous 24h:
- Visitors: ${currentSessions} (${visitorsChange.toFixed(1)}% change)
- Pageviews: ${currentPageviews} (${pageviewsChange.toFixed(1)}% change)
- Clicks: ${currentClicks} (${clicksChange.toFixed(1)}% change)
- Avg load time: ${currentLoadTimeMs ?? "n/a"} ms (${loadTimeChange.toFixed(1)}% change)
- Bounce rate: ${(currentBounceRate * 100).toFixed(1)}% (${bounceRateChange.toFixed(1)}% change)

If bounce rate increased and load time increased, mention performance as a likely contributor. Keep it to 1 sentence.`;
      const result = await chatModel.generateContent(prompt);
      const aiInsight = result.response.text().trim();
      if (aiInsight) {
        insight = aiInsight;
      }
    } catch (error: any) {
      console.warn("Analytics insight generation failed:", error);
    }

    return NextResponse.json({
      stats: {
        visitors: currentSessions,
        pageviews: currentPageviews,
        clicks: currentClicks,
        avgLoadTimeMs: currentLoadTimeMs,
        bounceRate: currentBounceRate,
      },
      trend: {
        visitorsChange,
        pageviewsChange,
        clicksChange,
        bounceRateChange,
        loadTimeChange,
      },
      insight,
    });
  } catch (error: any) {
    console.error("Error fetching analytics insights:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
