import { z } from "zod";
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// ---------------------------------------------------------------------------
// Shared header param
// ---------------------------------------------------------------------------
const ClerkOrgIdHeader = registry.registerParameter(
  "ClerkOrgId",
  z.string().openapi({ param: { name: "X-Clerk-Org-Id", in: "header" } })
);

// ---------------------------------------------------------------------------
// Error response
// ---------------------------------------------------------------------------
const ErrorResponseSchema = registry.register(
  "ErrorResponse",
  z.object({ error: z.string() }).openapi("ErrorResponse")
);

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
const HealthResponseSchema = registry.register(
  "HealthResponse",
  z
    .object({
      status: z.string(),
      service: z.string(),
    })
    .openapi("HealthResponse")
);

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "Health check",
  responses: {
    200: {
      description: "Service is healthy",
      content: { "application/json": { schema: HealthResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// POST /generate
// ---------------------------------------------------------------------------
export const GenerateRequestSchema = registry.register(
  "GenerateRequest",
  z
    .object({
      runId: z.string(),
      apolloEnrichmentId: z.string(),
      appId: z.string(),
      brandId: z.string(),
      campaignId: z.string(),
      // Lead person info
      leadFirstName: z.string(),
      leadLastName: z.string().optional(),
      leadTitle: z.string().optional(),
      leadEmail: z.string().optional(),
      leadLinkedinUrl: z.string().optional(),
      // Lead company info
      leadCompanyName: z.string(),
      leadCompanyDomain: z.string().optional(),
      leadCompanyIndustry: z.string().optional(),
      leadCompanySize: z.string().optional(),
      leadCompanyRevenueUsd: z.string().optional(),
      // Client (our company) info
      clientCompanyName: z.string(),
      clientBrandUrl: z.string().optional(),
      clientCompanyOverview: z.string().optional(),
      clientValueProposition: z.string().optional(),
      clientTargetAudience: z.string().optional(),
      clientCustomerPainPoints: z.union([z.string(), z.array(z.string())]).optional(),
      clientKeyFeatures: z.union([z.string(), z.array(z.string())]).optional(),
      clientProductDifferentiators: z.union([z.string(), z.array(z.string())]).optional(),
      clientCompetitors: z.union([z.string(), z.array(z.string())]).optional(),
      clientSocialProof: z
        .union([
          z.string(),
          z.object({
            caseStudies: z.array(z.string()).optional(),
            testimonials: z.array(z.string()).optional(),
            results: z.array(z.string()).optional(),
          }),
        ])
        .optional(),
      clientCallToAction: z.string().optional(),
      clientAdditionalContext: z.string().optional(),
    })
    .openapi("GenerateRequest")
);

const GenerateResponseSchema = registry.register(
  "GenerateResponse",
  z
    .object({
      id: z.string(),
      subject: z.string(),
      bodyHtml: z.string(),
      bodyText: z.string(),
      tokensInput: z.number(),
      tokensOutput: z.number(),
    })
    .openapi("GenerateResponse")
);

registry.registerPath({
  method: "post",
  path: "/generate",
  tags: ["Email Generation"],
  summary: "Generate an email for a lead",
  request: {
    headers: z.object({ "x-clerk-org-id": z.string() }),
    body: {
      required: true,
      content: { "application/json": { schema: GenerateRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Generated email",
      content: { "application/json": { schema: GenerateResponseSchema } },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// GET /generations/:runId
// ---------------------------------------------------------------------------
const GenerationsListResponseSchema = registry.register(
  "GenerationsListResponse",
  z
    .object({
      generations: z.array(z.object({}).passthrough()),
    })
    .openapi("GenerationsListResponse")
);

registry.registerPath({
  method: "get",
  path: "/generations/{runId}",
  tags: ["Email Generation"],
  summary: "Get all generations for a run",
  request: {
    headers: z.object({ "x-clerk-org-id": z.string() }),
    params: z.object({ runId: z.string() }),
  },
  responses: {
    200: {
      description: "List of generations",
      content: {
        "application/json": { schema: GenerationsListResponseSchema },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// GET /generations/by-enrichment/:apolloEnrichmentId
// ---------------------------------------------------------------------------
const GenerationSingleResponseSchema = registry.register(
  "GenerationSingleResponse",
  z
    .object({
      generation: z.object({}).passthrough(),
    })
    .openapi("GenerationSingleResponse")
);

registry.registerPath({
  method: "get",
  path: "/generations/by-enrichment/{apolloEnrichmentId}",
  tags: ["Email Generation"],
  summary: "Get generation by enrichment ID",
  request: {
    headers: z.object({ "x-clerk-org-id": z.string() }),
    params: z.object({ apolloEnrichmentId: z.string() }),
  },
  responses: {
    200: {
      description: "Email generation",
      content: {
        "application/json": { schema: GenerationSingleResponseSchema },
      },
    },
    404: {
      description: "Generation not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// POST /stats
// ---------------------------------------------------------------------------
export const StatsRequestSchema = registry.register(
  "StatsRequest",
  z
    .object({
      runIds: z.array(z.string()).optional(),
      appId: z.string().optional(),
      brandId: z.string().optional(),
      campaignId: z.string().optional(),
    })
    .openapi("StatsRequest")
);

const StatsResponseSchema = registry.register(
  "StatsResponse",
  z
    .object({
      stats: z.object({
        emailsGenerated: z.number(),
      }),
    })
    .openapi("StatsResponse")
);

registry.registerPath({
  method: "post",
  path: "/stats",
  tags: ["Stats"],
  summary: "Get aggregated stats by filters",
  request: {
    headers: z.object({ "x-clerk-org-id": z.string() }),
    body: {
      required: true,
      content: { "application/json": { schema: StatsRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Aggregated stats",
      content: { "application/json": { schema: StatsResponseSchema } },
    },
    400: {
      description: "Missing required fields",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// POST /stats/by-model
// ---------------------------------------------------------------------------
export const StatsByModelRequestSchema = registry.register(
  "StatsByModelRequest",
  z
    .object({
      runIds: z.array(z.string()).optional(),
      clerkOrgId: z.string().optional(),
      appId: z.string().optional(),
      brandId: z.string().optional(),
      campaignId: z.string().optional(),
    })
    .openapi("StatsByModelRequest")
);

const StatsByModelResponseSchema = registry.register(
  "StatsByModelResponse",
  z
    .object({
      stats: z.array(
        z.object({
          model: z.string(),
          count: z.number(),
          runIds: z.array(z.string()),
        })
      ),
    })
    .openapi("StatsByModelResponse")
);

registry.registerPath({
  method: "post",
  path: "/stats/by-model",
  tags: ["Stats"],
  summary: "Get email generation stats grouped by model (internal)",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: StatsByModelRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Stats grouped by model",
      content: {
        "application/json": { schema: StatsByModelResponseSchema },
      },
    },
    400: {
      description: "Missing required fields",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});
