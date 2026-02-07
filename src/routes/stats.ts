import { Router } from "express";
import { db } from "../db/index.js";
import { emailGenerations, orgs } from "../db/schema.js";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";

const router = Router();

/**
 * POST /stats/by-model - Get email generation stats grouped by model
 * No auth — internal network trust (used by campaign-service leaderboard)
 * Body: { runIds: string[], clerkOrgId?: string, appId?: string, brandId?: string, campaignId?: string }
 */
router.post("/stats/by-model", async (req, res) => {
  // #swagger.tags = ['Stats']
  // #swagger.summary = 'Get email generation stats grouped by model (internal)'
  /* #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    schema: { runIds: ['string'], clerkOrgId: 'string (optional)', appId: 'string (optional)', brandId: 'string (optional)', campaignId: 'string (optional)' }
  } */
  // #swagger.responses[200] = { description: 'Stats grouped by model', schema: { stats: [{ model: 'string', count: 0, runIds: ['string'] }] } }
  try {
    const { runIds, clerkOrgId, appId, brandId, campaignId } = req.body as {
      runIds: string[];
      clerkOrgId?: string;
      appId?: string;
      brandId?: string;
      campaignId?: string;
    };

    if (!runIds || !Array.isArray(runIds)) {
      return res.status(400).json({ error: "runIds array required" });
    }

    if (runIds.length === 0) {
      return res.json({ stats: [] });
    }

    const conditions: SQL[] = [
      inArray(emailGenerations.runId, runIds),
    ];
    if (appId) conditions.push(eq(emailGenerations.appId, appId));
    if (brandId) conditions.push(eq(emailGenerations.brandId, brandId));
    if (campaignId) conditions.push(eq(emailGenerations.campaignId, campaignId));

    // If clerkOrgId provided, resolve to internal orgId via join
    if (clerkOrgId) {
      const org = await db.query.orgs.findFirst({
        where: (o, { eq }) => eq(o.clerkOrgId, clerkOrgId),
        columns: { id: true },
      });
      if (!org) {
        return res.json({ stats: [] });
      }
      conditions.push(eq(emailGenerations.orgId, org.id));
    }

    // Group email generations by model, counting and collecting runIds
    const results = await db
      .select({
        model: emailGenerations.model,
        count: sql<number>`count(*)::int`,
        runIds: sql<string[]>`array_agg(distinct ${emailGenerations.runId})`,
      })
      .from(emailGenerations)
      .where(and(...conditions))
      .groupBy(emailGenerations.model);

    res.json({
      stats: results.map((r) => ({
        model: r.model,
        count: r.count,
        runIds: r.runIds,
      })),
    });
  } catch (error) {
    console.error("Get stats by model error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
