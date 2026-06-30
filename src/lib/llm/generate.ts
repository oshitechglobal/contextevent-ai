import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export type BioStyle = "Formal" | "Conversational" | "Executive";
export type BioLength = "Brief" | "Standard" | "Detailed";

export interface GenerationInput {
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  company: string | null;
  industry: string | null;
  interests: string[];
  bioNotes: string | null;
  timelineWins: string[];
  bioStyle: BioStyle;
  bioLength: BioLength;
}

export interface ConversationStarter {
  text: string;
  theme: string;
}

export interface GenerationOutput {
  bio: string;
  conversationStarters: ConversationStarter[];
}

const ConversationStarterSchema = z.object({
  text: z.string().min(1),
  theme: z.string().min(1),
});

const GenerationOutputSchema = z.object({
  bio: z.string().min(1),
  conversationStarters: z.array(ConversationStarterSchema).length(5),
});

const LENGTH_GUIDANCE: Record<BioLength, string> = {
  Brief: "2-3 sentences, roughly 40-60 words. Punchy and scannable.",
  Standard: "1 short paragraph, roughly 80-120 words.",
  Detailed: "2 paragraphs, roughly 150-220 words, with more texture on career trajectory.",
};

const STYLE_GUIDANCE: Record<BioStyle, string> = {
  Formal:
    "Formal and polished, third person, suitable for a printed event program or press kit. No contractions, no slang.",
  Conversational:
    "Warm and conversational, third person, as if introducing this person to a friend before a networking event. Natural, human, not corporate.",
  Executive:
    "Sharp and authoritative, third person, emphasizing leadership impact and strategic scope. Suitable for a board-level introduction.",
};

function buildSystemPrompt(): string {
  return `You are a professional bio writer for ContextEvent AI, a platform that prepares event hosts with rich attendee context before networking events. You write accurate, specific, non-generic biographical content and produce conversation starters that genuinely help someone start a meaningful professional conversation.

You must respond with ONLY a single valid JSON object — no markdown code fences, no preamble, no explanation text before or after. The JSON object must exactly match this shape:

{
  "bio": "string — the biographical narrative",
  "conversationStarters": [
    { "text": "string — the conversation starter itself, phrased as something the host could literally say", "theme": "string — a short professional theme tag, e.g. 'Career Growth', 'Industry Trends', 'Shared Interests', 'Recent Achievement', 'Company News'" }
  ]
}

The "conversationStarters" array must contain EXACTLY 5 items, each with a distinct theme. Ground every conversation starter in specific facts provided in the user's context (their actual role, company, recent wins, or interests) — never write generic starters like "What do you do?" or "Tell me about yourself." Do not fabricate facts not present in the provided context.`;
}

function buildUserPrompt(input: GenerationInput): string {
  const wins = input.timelineWins.length
    ? input.timelineWins.map((w) => `- ${w}`).join("\n")
    : "(No recent career milestones were identified — do not reference any achievements that aren't listed here.)";

  const interests = input.interests.length ? input.interests.join(", ") : "(none on record)";

  return `Generate a bio and 5 conversation starters for the following event attendee.

ATTENDEE PROFILE
Name: ${input.firstName} ${input.lastName}
Job Title: ${input.jobTitle ?? "Unknown"}
Company: ${input.company ?? "Unknown"}
Industry: ${input.industry ?? "Unknown"}
Interests on record: ${interests}
Additional bio notes: ${input.bioNotes ?? "(none)"}

RECENT TIMELINE WINS
${wins}

GENERATION CONFIGURATION
Bio Style: ${input.bioStyle} — ${STYLE_GUIDANCE[input.bioStyle]}
Bio Length: ${input.bioLength} — ${LENGTH_GUIDANCE[input.bioLength]}

Write the bio in the specified style and length. Base the 5 conversation starters on the most interesting, specific, and recent facts above — prioritize timeline wins and interests over generic role description. Respond with the JSON object only.`;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

/**
 * Epic 4 — Configuration-Driven LLM Generation.
 *
 * Single concurrent call to Claude that returns structured JSON containing
 * the polished bio narrative AND exactly five themed conversation starters
 * in one round trip. Validates the response shape with Zod and retries
 * once on a malformed/non-JSON response before surfacing a clear error.
 */
export async function generateBioAndStarters(input: GenerationInput): Promise<GenerationOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in your environment to enable bio generation."
    );
  }

  const client = new Anthropic({ apiKey });
  const system = buildSystemPrompt();
  const user = buildUserPrompt(input);

  const maxAttempts = 2;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        temperature: 0.7,
        system,
        messages: [
          {
            role: "user",
            content:
              attempt === 1
                ? user
                : `${user}\n\nIMPORTANT: Your previous response was not valid JSON matching the required schema. Respond with ONLY the raw JSON object, nothing else.`,
          },
        ],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        lastError = "Claude response contained no text block";
        continue;
      }

      const cleaned = stripCodeFences(textBlock.text);
      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        lastError = "Claude response was not valid JSON";
        continue;
      }

      const validated = GenerationOutputSchema.safeParse(parsed);
      if (!validated.success) {
        lastError = `Claude response did not match required schema: ${validated.error.message}`;
        continue;
      }

      return validated.data;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown Claude API error";
      // If it's an auth/billing error, retrying won't help — fail fast.
      if (lastError.toLowerCase().includes("authentication") || lastError.toLowerCase().includes("billing")) {
        throw new Error(`Claude API error: ${lastError}`);
      }
    }
  }

  throw new Error(`Bio generation failed after ${maxAttempts} attempts: ${lastError}`);
}
