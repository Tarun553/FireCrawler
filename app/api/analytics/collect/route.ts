import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const analyticsEventSchema = z.object({
  publicKey: z.string().min(1, "Public key is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  eventType: z.enum(["PAGEVIEW", "CLICK", "SESSION_START"]),
  path: z.string().optional(),
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  elementTag: z.string().optional(),
  elementText: z.string().optional(),
  loadTimeMs: z.number().int().nonnegative().optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string().datetime().optional(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = analyticsEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400, headers: corsHeaders },
      );
    }

    const {
      publicKey,
      sessionId,
      eventType,
      path,
      referrer,
      userAgent,
      elementTag,
      elementText,
      loadTimeMs,
      metadata,
      timestamp,
    } = validation.data;

    const project = await prisma.project.findUnique({
      where: { publicKey },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Invalid public key" },
        { status: 404, headers: corsHeaders },
      );
    }

    const eventTime = timestamp ? new Date(timestamp) : new Date();

    await prisma.analyticsSession.upsert({
      where: { sessionId },
      create: {
        projectId: project.id,
        sessionId,
        userAgent,
        referrer,
        landingPath: path,
        startedAt: eventTime,
        lastSeenAt: eventTime,
      },
      update: {
        lastSeenAt: eventTime,
        userAgent: userAgent ?? undefined,
        referrer: referrer ?? undefined,
      },
    });

    await prisma.analyticsEvent.create({
      data: {
        projectId: project.id,
        sessionId,
        eventType,
        path,
        elementTag,
        elementText,
        loadTimeMs,
        metadata,
        createdAt: eventTime,
      },
    });

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Error collecting analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
