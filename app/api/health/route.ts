import { NextResponse } from "next/server";

// Forced dynamic so this is a real runtime check. Without it Next would
// statically prerender the response at build time, and the endpoint would keep
// returning 200 from a cached file even if the running app were unhealthy.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
