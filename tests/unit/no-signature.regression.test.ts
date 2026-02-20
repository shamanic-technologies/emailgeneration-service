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
              text: JSON.stringify({ subject: "Quick question", body: "Hi John, noticed Acme is scaling fast. Curious how you handle outreach today?", followup1: "Just circling back.", followup2: "Last note — different angle." }),
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

  it("sequence step 1 bodyHtml does not contain signature elements", async () => {
    const result = await generateFromTemplate("fake-key", params);
    const bodyHtml = result.sequence[0].bodyHtml;

    expect(bodyHtml).not.toContain("Kevin Lourd");
    expect(bodyHtml).not.toContain("GrowthAgency.dev");
    expect(bodyHtml).not.toContain("pm:unsubscribe");
    expect(bodyHtml).not.toContain("<table");
  });

  it("sequence step 1 bodyText does not contain signature elements", async () => {
    const result = await generateFromTemplate("fake-key", params);
    const bodyText = result.sequence[0].bodyText;

    expect(bodyText).not.toContain("Kevin Lourd");
    expect(bodyText).not.toContain("GrowthAgency.dev");
    expect(bodyText).not.toContain("pm:unsubscribe");
  });
});
