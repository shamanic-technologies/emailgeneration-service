import { describe, it, expect, vi } from "vitest";
import { generateEmail } from "../../src/lib/anthropic-client";

// Mock the Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text" as const,
              text: "SUBJECT: Quick question\n---\nHi John, noticed Acme is scaling fast. Curious how you handle outreach today?",
            },
          ],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      };
    },
  };
});

describe("generateEmail should NOT include a signature", () => {
  const params = {
    leadFirstName: "John",
    leadCompanyName: "Acme",
    clientCompanyName: "Growth Agency",
  };

  it("bodyHtml does not contain signature elements", async () => {
    const result = await generateEmail("fake-key", params);

    expect(result.bodyHtml).not.toContain("Kevin Lourd");
    expect(result.bodyHtml).not.toContain("GrowthAgency.dev");
    expect(result.bodyHtml).not.toContain("pm:unsubscribe");
    expect(result.bodyHtml).not.toContain("<table");
  });

  it("bodyText does not contain signature elements", async () => {
    const result = await generateEmail("fake-key", params);

    expect(result.bodyText).not.toContain("Kevin Lourd");
    expect(result.bodyText).not.toContain("GrowthAgency.dev");
    expect(result.bodyText).not.toContain("pm:unsubscribe");
  });
});
