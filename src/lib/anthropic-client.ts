import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-5";

const SYSTEM_PROMPT = `IMPORTANT RULES — apply to every email you generate:
- NEVER mention the client's company name. Use vague references instead: "a client of mine", "a company I work with", "one of my clients", etc.
- NEVER include the client's website URL.
- The goal is to spark curiosity so the recipient wants to learn more and replies to ask for details.

## Opening line — contrarian angle (MANDATORY)
- NEVER open with a generic compliment about the recipient's work (e.g. "Your work in X caught my attention", "I've been following your…", "I admire what you're doing at…"). These signal AI-generated spam and kill engagement.
- Instead, open with a sharp contrarian insight — a bold, non-obvious observation that challenges a widely held assumption in the recipient's space.
- The contrarian angle MUST sit at the intersection of: (1) the recipient's mission / what they care about, and (2) the client's raison d'être / why the client's offering exists.
- If multiple contrarian angles are possible, choose the one that resonates most deeply with the recipient's specific role, industry, or stated mission.
- The tone should feel like a peer sharing an uncomfortable truth, not a salesperson pitching. Think provocative op-ed, not cold email.`;

export interface GenerateFromTemplateParams {
  promptTemplate: string;
  variables: Record<string, unknown>;
}

export interface GenerateResult {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  promptRaw: string;
  responseRaw: object;
}

/**
 * Coerce an unknown value to a string for template substitution.
 * - strings pass through
 * - arrays of strings are comma-joined
 * - everything else is JSON-stringified
 */
export function coerceToString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value.join(", ");
  }
  return JSON.stringify(value);
}

/**
 * Substitute {{variable}} placeholders in a prompt template with values.
 * Non-string values are coerced via coerceToString.
 */
export function substituteVariables(
  template: string,
  variables: Record<string, unknown>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, coerceToString(value));
  }
  return result;
}

/**
 * Generate content by substituting variables into a stored prompt template
 * and sending it to Claude.
 */
export async function generateFromTemplate(
  apiKey: string,
  params: GenerateFromTemplateParams
): Promise<GenerateResult> {
  const anthropic = new Anthropic({ apiKey });

  const prompt = substituteVariables(params.promptTemplate, params.variables);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  const text = textContent?.type === "text" ? textContent.text : "";

  const parsed = parseEmailResponse(text);

  const tokensInput = response.usage.input_tokens;
  const tokensOutput = response.usage.output_tokens;
  const costUsd =
    (tokensInput / 1_000_000) * 5 +
    (tokensOutput / 1_000_000) * 25;

  return {
    ...parsed,
    tokensInput,
    tokensOutput,
    costUsd,
    promptRaw: prompt,
    responseRaw: response,
  };
}

function parseEmailResponse(text: string): {
  subject: string;
  bodyHtml: string;
  bodyText: string;
} {
  const lines = text.trim().split("\n");
  let subject = "";
  const bodyLines: string[] = [];
  let inBody = false;

  for (const line of lines) {
    if (line.startsWith("SUBJECT:")) {
      subject = line.replace("SUBJECT:", "").trim();
    } else if (line.trim() === "---") {
      inBody = true;
    } else if (inBody) {
      bodyLines.push(line);
    }
  }

  const bodyText = bodyLines.join("\n").trim();
  const bodyHtml = bodyText
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return { subject, bodyHtml, bodyText };
}
