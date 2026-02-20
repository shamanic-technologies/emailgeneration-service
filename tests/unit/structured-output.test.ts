import { describe, it, expect, vi } from "vitest";
import { generateFromTemplate } from "../../src/lib/anthropic-client";

const mockCreate = vi.fn().mockResolvedValue({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify({
        subject: "Quick question",
        body: "Hey Sarah,\n\nMost nonprofits treat community as a vanity metric — but the ones that last are built around shared purpose, not headcount.\n\nA client of mine is looking for a handful of organizers to help launch public goods initiatives. Would 30 minutes be worth a conversation?",
      }),
    },
  ],
  usage: { input_tokens: 200, output_tokens: 80 },
});

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

describe("structured JSON output", () => {
  it("sends output_config with json_schema to Anthropic API", async () => {
    await generateFromTemplate("fake-key", {
      promptTemplate: "Write an email to {{recipientName}}",
      variables: { recipientName: "Sarah" },
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.output_config).toEqual({
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
          },
          required: ["subject", "body"],
          additionalProperties: false,
        },
      },
    });
  });

  it("parses JSON response into subject, bodyText, and bodyHtml", async () => {
    const result = await generateFromTemplate("fake-key", {
      promptTemplate: "Write an email to {{recipientName}}",
      variables: { recipientName: "Sarah" },
    });

    expect(result.subject).toBe("Quick question");
    expect(result.bodyText).toContain("Hey Sarah");
    expect(result.bodyText).toContain("shared purpose");
    // HTML wraps paragraphs in <p> tags
    expect(result.bodyHtml).toContain("<p>");
    expect(result.bodyHtml).toContain("Hey Sarah");
  });

  it("includes output rule in system prompt requiring email-only response", async () => {
    await generateFromTemplate("fake-key", {
      promptTemplate: "Write an email to {{recipientName}}",
      variables: { recipientName: "Sarah" },
    });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain("Always respond with the final email");
    expect(callArgs.system).toContain("Never respond with commentary");
  });
});
