import { Router } from "express";
import { eq, and, inArray, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { emailGenerations, prompts } from "../db/schema.js";
import { serviceAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { generateFromTemplate } from "../lib/anthropic-client.js";
import { getByokKey } from "../lib/key-client.js";
import { createRun, updateRun, addCosts } from "../lib/runs-client.js";
import { GenerateRequestSchema, StatsRequestSchema } from "../schemas.js";

const router = Router();

/**
 * POST /generate — Generate content using a stored prompt template + variables
 */
router.post("/generate", serviceAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = GenerateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    }

    const {
      appId,
      type,
      variables,
      runId,
      brandId,
      campaignId,
      apolloEnrichmentId,
      idempotencyKey,
    } = parsed.data;

    // Idempotency: return existing generation if key matches
    if (idempotencyKey) {
      const existing = await db.query.emailGenerations.findFirst({
        where: and(
          eq(emailGenerations.orgId, req.orgId!),
          eq(emailGenerations.idempotencyKey, idempotencyKey)
        ),
      });

      if (existing) {
        return res.json({
          id: existing.id,
          subject: existing.subject ?? "",
          bodyHtml: existing.bodyHtml ?? "",
          bodyText: existing.bodyText ?? "",
          tokensInput: existing.tokensInput ?? 0,
          tokensOutput: existing.tokensOutput ?? 0,
        });
      }
    }

    // Look up the stored prompt for this app + type
    const storedPrompt = await db.query.prompts.findFirst({
      where: and(eq(prompts.appId, appId), eq(prompts.type, type)),
    });

    if (!storedPrompt) {
      return res.status(404).json({
        error: `No prompt found for appId=${appId}, type=${type}. Register one via PUT /prompts first.`,
      });
    }

    // Get Anthropic API key
    const anthropicApiKey = await getByokKey(req.clerkOrgId!, "anthropic");

    // Generate using the stored prompt + variable substitution
    const result = await generateFromTemplate(anthropicApiKey, {
      promptTemplate: storedPrompt.prompt,
      variables,
    });

    // Store in database
    const [generation] = await db
      .insert(emailGenerations)
      .values({
        orgId: req.orgId!,
        runId,
        apolloEnrichmentId: apolloEnrichmentId ?? null,
        promptType: type,
        appId,
        brandId: brandId ?? "",
        campaignId: campaignId ?? "",
        variablesRaw: variables,
        subject: result.subject,
        bodyHtml: result.bodyHtml,
        bodyText: result.bodyText,
        model: "claude-opus-4-5",
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        promptRaw: result.promptRaw,
        responseRaw: result.responseRaw,
        idempotencyKey: idempotencyKey ?? null,
      })
      .returning();

    // Track run + costs in runs-service
    try {
      const genRun = await createRun({
        clerkOrgId: req.clerkOrgId!,
        appId,
        brandId,
        campaignId,
        serviceName: "emailgeneration-service",
        taskName: "single-generation",
        parentRunId: runId,
      });

      // Link generation run to email record IMMEDIATELY so per-item cost
      // lookups work even if addCosts/updateRun fail below
      await db.update(emailGenerations)
        .set({ generationRunId: genRun.id })
        .where(eq(emailGenerations.id, generation.id));

      const costItems = [];
      if (result.tokensInput) {
        costItems.push({ costName: "anthropic-opus-4.5-tokens-input", quantity: result.tokensInput });
      }
      if (result.tokensOutput) {
        costItems.push({ costName: "anthropic-opus-4.5-tokens-output", quantity: result.tokensOutput });
      }
      if (costItems.length > 0) {
        await addCosts(genRun.id, costItems);
      }
      await updateRun(genRun.id, "completed");
    } catch (err) {
      console.error("[emailgen] COST TRACKING FAILED — costs will be missing from campaign totals.", {
        runId,
        apolloEnrichmentId,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        costNames: ["anthropic-opus-4.5-tokens-input", "anthropic-opus-4.5-tokens-output"],
        error: err instanceof Error ? err.message : err,
      });
    }

    res.json({
      id: generation.id,
      subject: result.subject,
      bodyHtml: result.bodyHtml,
      bodyText: result.bodyText,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
    });
  } catch (error) {
    console.error("Generate error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

/**
 * GET /generations - List generations with filters
 * Query params: runId, campaignId, appId, brandId (at least one required)
 */
router.get("/generations", serviceAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { runId, campaignId, appId, brandId } = req.query as {
      runId?: string;
      campaignId?: string;
      appId?: string;
      brandId?: string;
    };

    if (!runId && !campaignId && !appId && !brandId) {
      return res.status(400).json({ error: "At least one filter required: runId, campaignId, appId, or brandId" });
    }

    const conditions: SQL[] = [eq(emailGenerations.orgId, req.orgId!)];
    if (runId) conditions.push(eq(emailGenerations.runId, runId));
    if (campaignId) conditions.push(eq(emailGenerations.campaignId, campaignId));
    if (appId) conditions.push(eq(emailGenerations.appId, appId));
    if (brandId) conditions.push(eq(emailGenerations.brandId, brandId));

    const generations = await db.query.emailGenerations.findMany({
      where: and(...conditions),
      orderBy: (gens, { desc }) => [desc(gens.createdAt)],
    });

    res.json({ generations });
  } catch (error) {
    console.error("List generations error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /generations/by-enrichment/:apolloEnrichmentId - Get generation by enrichment ID
 */
router.get("/generations/by-enrichment/:apolloEnrichmentId", serviceAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { apolloEnrichmentId } = req.params;

    const generation = await db.query.emailGenerations.findFirst({
      where: (gens, { eq, and }) =>
        and(
          eq(gens.apolloEnrichmentId, apolloEnrichmentId),
          eq(gens.orgId, req.orgId!)
        ),
    });

    if (!generation) {
      return res.status(404).json({ error: "Generation not found" });
    }

    res.json({ generation });
  } catch (error) {
    console.error("Get generation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /stats - Get aggregated stats for multiple run IDs
 */
router.post("/stats", serviceAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = StatsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    }

    const { runIds, appId, brandId, campaignId } = parsed.data;

    const hasRunIds = Array.isArray(runIds) && runIds.length > 0;

    if (!hasRunIds && !appId && !brandId && !campaignId) {
      return res.status(400).json({ error: "At least one filter required: runIds, appId, brandId, or campaignId" });
    }

    const conditions: SQL[] = [
      eq(emailGenerations.orgId, req.orgId!),
    ];
    if (hasRunIds) conditions.push(inArray(emailGenerations.runId, runIds!));
    if (appId) conditions.push(eq(emailGenerations.appId, appId));
    if (brandId) conditions.push(eq(emailGenerations.brandId, brandId));
    if (campaignId) conditions.push(eq(emailGenerations.campaignId, campaignId));

    // Count email generations
    const generations = await db.query.emailGenerations.findMany({
      where: and(...conditions),
      columns: { id: true },
    });

    res.json({
      stats: {
        emailsGenerated: generations.length,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
