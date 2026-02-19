import { describe, it, expect, vi } from "vitest";
import { generateFromTemplate } from "../../src/lib/anthropic-client";

const mockCreate = vi.fn().mockResolvedValue({
  content: [
    {
      type: "text" as const,
      text: "SUBJECT: Quick question\n---\nMost community organizers focus on local impact — but that instinct to keep things small might be the biggest barrier to lasting change.\n\nI'm working with a client building a global network for funding public welfare initiatives, and they need experienced organizers as founding ambassadors.",
    },
  ],
  usage: { input_tokens: 100, output_tokens: 50 },
});

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

describe("system prompt enforces contrarian opening", () => {
  it("instructs to never open with a generic compliment", async () => {
    await generateFromTemplate("fake-key", {
      promptTemplate: "Write an email to {{recipientName}}",
      variables: { recipientName: "Susan" },
    });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain("NEVER open with a generic compliment");
  });

  it("instructs to open with a contrarian insight", async () => {
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain("contrarian");
    expect(callArgs.system).toContain("bold, non-obvious observation");
  });

  it("requires the angle to connect recipient mission and client raison d'être", async () => {
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain("recipient's mission");
    expect(callArgs.system).toContain("client's raison d'être");
  });
});
