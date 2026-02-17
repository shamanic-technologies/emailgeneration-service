import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { prompts } from "../db/schema.js";
import { serviceAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { UpsertPromptRequestSchema } from "../schemas.js";

const router = Router();

/**
 * PUT /prompts — Upsert a prompt template for an app (idempotent)
 */
router.put("/prompts", serviceAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = UpsertPromptRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    }

    const { appId, type, prompt } = parsed.data;

    // Upsert: insert or update on (appId, type) conflict
    const existing = await db.query.prompts.findFirst({
      where: and(eq(prompts.appId, appId), eq(prompts.type, type)),
    });

    let result;
    if (existing) {
      [result] = await db
        .update(prompts)
        .set({ prompt, updatedAt: new Date() })
        .where(and(eq(prompts.appId, appId), eq(prompts.type, type)))
        .returning();
    } else {
      [result] = await db
        .insert(prompts)
        .values({ appId, type, prompt })
        .returning();
    }

    res.json({
      id: result.id,
      appId: result.appId,
      type: result.type,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Upsert prompt error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

/**
 * GET /prompts?appId&type — Get a stored prompt template
 */
router.get("/prompts", serviceAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { appId, type } = req.query as { appId?: string; type?: string };

    if (!appId || !type) {
      return res.status(400).json({ error: "appId and type query params required" });
    }

    const result = await db.query.prompts.findFirst({
      where: and(eq(prompts.appId, appId), eq(prompts.type, type)),
    });

    if (!result) {
      return res.status(404).json({ error: `No prompt found for appId=${appId}, type=${type}` });
    }

    res.json({
      id: result.id,
      appId: result.appId,
      type: result.type,
      prompt: result.prompt,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Get prompt error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

export default router;
