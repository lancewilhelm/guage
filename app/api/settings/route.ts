import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { userSettings, globalSettings } from "@/utils/db/schema";
import { cloudDb } from "@/utils/db/cloud";
import { getSession } from "@/utils/auth";
import { logger } from "@/utils/logger";

const GLOBAL_SETTINGS_ID = "00000000-0000-0000-0000-000000000000";

// GET /api/settings - Retrieve user and (if authorized) global settings
export async function GET() {
  logger.debug("GET /api/settings");
  const session = await getSession();
  if (!session) {
    logger.warn("GET /api/settings: Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // Fetch user-specific settings
    const userRes = await cloudDb
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    // Fetch global settings only if the user is admin/owner
    let adminSettings = {};
    if (session.user.role === "admin" || session.user.role === "owner") {
      const globalRes = await cloudDb
        .select()
        .from(globalSettings)
        .where(eq(globalSettings.id, GLOBAL_SETTINGS_ID));
      adminSettings = globalRes[0]?.settings || {};
    }
    return NextResponse.json({
      userSettings: userRes[0]?.settings || {},
      adminSettings,
    });
  } catch (error) {
    logger.error(error, "Error fetching settings");
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

// POST /api/settings - Update user and possibly global settings
export async function POST(req: Request) {
  logger.debug("POST /api/settings");
  const session = await getSession();
  if (!session) {
    logger.warn("POST /api/settings: Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const isAdmin =
    session.user.role === "admin" || session.user.role === "owner";

  try {
    const body = await req.json();

    // Expecting { user?: { settings, updatedAt }, admin?: { settings, updatedAt } }
    const { user: userUpdate, admin: adminUpdate } = body;

    // Update user settings if provided
    if (userUpdate) {
      // Upsert user settings
      await cloudDb
        .insert(userSettings)
        .values({
          userId,
          settings: userUpdate.settings,
          updatedAt: new Date(userUpdate.updatedAt),
        })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            settings: sql`EXCLUDED.settings`,
            updatedAt: sql`EXCLUDED.updated_at`,
          },
        });
    }

    // Update global settings if provided and if the user is admin/owner
    if (adminUpdate && isAdmin) {
      await cloudDb
        .insert(globalSettings)
        .values({
          id: GLOBAL_SETTINGS_ID,
          settings: adminUpdate.settings,
          updatedAt: new Date(adminUpdate.updatedAt),
        })
        .onConflictDoUpdate({
          target: globalSettings.id,
          set: {
            settings: sql`EXCLUDED.settings`,
            updatedAt: sql`EXCLUDED.updated_at`,
          },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(error, "Error updating settings");
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
