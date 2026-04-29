import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const logBodySchema = z.object({
  logs: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const body = logBodySchema.parse(await request.json().catch(() => ({})));

  if (body.logs) {
    for (const logLine of body.logs) {
      console.log("[apple-wallet]", logLine);
    }
  }

  return new NextResponse(null, { status: 200 });
}
