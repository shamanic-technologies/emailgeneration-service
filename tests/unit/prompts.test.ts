import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Mock auth middleware
vi.mock("../../src/middleware/auth.js", () => ({
  serviceAuth: (req: any, _res: any, next: any) => {
    req.orgId = "org-internal-123";
    req.clerkOrgId = req.headers["x-clerk-org-id"] || "org_test";
    next();
  },
}));

const NOW = new Date("2025-01-15T00:00:00Z");

// Mock the DB
const mockFindFirst = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateReturning = vi.fn();

vi.mock("../../src/db/index.js", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: (...args: unknown[]) => mockInsertReturning(...args),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: (...args: unknown[]) => mockUpdateReturning(...args),
        }),
      }),
    }),
    query: {
      prompts: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}));

vi.mock("../../src/db/schema.js", () => ({
  prompts: { appId: { name: "app_id" }, type: { name: "type" } },
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  return app;
}

describe("PUT /prompts", () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = createTestApp();
    const { default: promptRoutes } = await import("../../src/routes/prompts.js");
    app.use(promptRoutes);
  });

  it("creates a new prompt when none exists", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockInsertReturning.mockResolvedValue([{
      id: "prompt-1",
      appId: "my-app",
      type: "email",
      prompt: "Write an email to {{recipient}}",
      createdAt: NOW,
      updatedAt: NOW,
    }]);

    const res = await request(app)
      .put("/prompts")
      .set("X-Clerk-Org-Id", "org_test")
      .send({
        appId: "my-app",
        type: "email",
        prompt: "Write an email to {{recipient}}",
      })
      .expect(200);

    expect(res.body.id).toBe("prompt-1");
    expect(res.body.appId).toBe("my-app");
    expect(res.body.type).toBe("email");
  });

  it("updates an existing prompt", async () => {
    mockFindFirst.mockResolvedValue({
      id: "prompt-1",
      appId: "my-app",
      type: "email",
      prompt: "old prompt",
    });
    mockUpdateReturning.mockResolvedValue([{
      id: "prompt-1",
      appId: "my-app",
      type: "email",
      prompt: "new prompt with {{newVar}}",
      createdAt: NOW,
      updatedAt: new Date("2025-01-16T00:00:00Z"),
    }]);

    const res = await request(app)
      .put("/prompts")
      .set("X-Clerk-Org-Id", "org_test")
      .send({
        appId: "my-app",
        type: "email",
        prompt: "new prompt with {{newVar}}",
      })
      .expect(200);

    expect(res.body.appId).toBe("my-app");
  });

  it("returns 400 for missing required fields", async () => {
    await request(app)
      .put("/prompts")
      .set("X-Clerk-Org-Id", "org_test")
      .send({ appId: "my-app" }) // missing type, prompt
      .expect(400);
  });
});

describe("GET /prompts", () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = createTestApp();
    const { default: promptRoutes } = await import("../../src/routes/prompts.js");
    app.use(promptRoutes);
  });

  it("returns stored prompt", async () => {
    mockFindFirst.mockResolvedValue({
      id: "prompt-1",
      appId: "my-app",
      type: "email",
      prompt: "Write an email to {{recipient}}",
      createdAt: NOW,
      updatedAt: NOW,
    });

    const res = await request(app)
      .get("/prompts?appId=my-app&type=email")
      .set("X-Clerk-Org-Id", "org_test")
      .expect(200);

    expect(res.body.prompt).toBe("Write an email to {{recipient}}");
  });

  it("returns 404 when prompt not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    await request(app)
      .get("/prompts?appId=unknown&type=email")
      .set("X-Clerk-Org-Id", "org_test")
      .expect(404);
  });

  it("returns 400 when appId or type missing", async () => {
    await request(app)
      .get("/prompts?appId=my-app")
      .set("X-Clerk-Org-Id", "org_test")
      .expect(400);
  });
});
