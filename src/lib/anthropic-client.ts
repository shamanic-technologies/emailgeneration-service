import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You're writing a cold email on behalf of a sales rep. Your job is to get a reply — nothing else matters.

## Keep it simple
Write like a human texting a smart friend. Short sentences. Plain words. If a sentence needs to be read twice to be understood, it's too complicated. The contrarian angle should hit instantly — not require a PhD to parse.

## Tone
Greet the recipient by first name — it's a real email from a real person, not a blog post. Keep it warm, direct, conversational.

## Identity protection
Keep the client anonymous. Say "a client of mine", "a company I work with", etc. Don't include their website URL. Curiosity is the goal — the recipient should want to reply to learn more.

## Opening line
Don't open with a compliment. "Your work in X caught my attention" is the fastest way to get deleted — it screams template. Instead, lead with a contrarian angle: a simple, provocative observation that challenges something people in the recipient's world take for granted, and that connects to why the client's offering exists. The best opening feels like an insight from a peer, not a pitch from a stranger.

## Scam filter
Cold emails live or die on trust. Avoid anything that pattern-matches to scam or MLM: specific dollar amounts, crypto terminology (tokens, chains, USDT, Web3), compensation details, "passive income" language. Lead with the mission and the human impact. The money conversation happens later, on a call, once trust is established.`;

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

  return {
    ...parsed,
    tokensInput,
    tokensOutput,
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
