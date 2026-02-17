import { describe, it, expect, vi } from "vitest";
import { generateFromTemplate } from "../../src/lib/anthropic-client";

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

describe("generateFromTemplate should NOT include a signature", () => {
  const params = {
    promptTemplate: "Write a cold email to {{recipientName}} from {{senderName}}. Do NOT add any signature block.",
    variables: {
      recipientName: "John at Acme",
      senderName: "Growth Agency",
    },
  };

  it("bodyHtml does not contain signature elements", async () => {
    const result = await generateFromTemplate("fake-key", params);

    expect(result.bodyHtml).not.toContain("Kevin Lourd");
    expect(result.bodyHtml).not.toContain("GrowthAgency.dev");
    expect(result.bodyHtml).not.toContain("pm:unsubscribe");
    expect(result.bodyHtml).not.toContain("<table");
  });

  it("bodyText does not contain signature elements", async () => {
    const result = await generateFromTemplate("fake-key", params);

    expect(result.bodyText).not.toContain("Kevin Lourd");
    expect(result.bodyText).not.toContain("GrowthAgency.dev");
    expect(result.bodyText).not.toContain("pm:unsubscribe");
  });
});
