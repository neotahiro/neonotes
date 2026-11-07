import { NextRequest, NextResponse } from "next/server";
import { DriveAuthError, getDriveAccess } from "@/lib/drive/access";
import { ensureRootFolder } from "@/lib/drive/drive";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** Checks that Drive is reachable and the Noenotes folder exists (creating it if needed). */
export async function GET(req: NextRequest) {
  try {
    const token = await getDriveAccess(req);
    await ensureRootFolder(token);
    return NextResponse.json({ connected: true }, { headers: noStore });
  } catch (err) {
    if (err instanceof DriveAuthError) {
      return NextResponse.json({ connected: false, reason: err.reason }, { status: 401, headers: noStore });
    }
    console.error("Drive status check failed:", err);
    return NextResponse.json({ connected: false, reason: "error" }, { status: 502, headers: noStore });
  }
}
