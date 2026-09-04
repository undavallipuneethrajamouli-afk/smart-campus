import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";

const SYSTEM_PROMPT = `You are the Smart Campus AI Helpdesk, a general assistant for a college's students and staff.

You do NOT currently have access to this specific college's official documents, policies, academic calendar, or FAQs — that knowledge base has not been connected yet. So:
- If asked about this college's specific rules, deadlines, fees, contact details, exam schedules, or any institution-specific fact, say plainly that you don't have that information yet and suggest they check with the relevant department or official notice board. Never invent a specific policy, date, name, or number.
- For general educational questions (explaining a concept, study help, general academic guidance), answer normally and helpfully using your own knowledge.
Keep answers concise and clear.`;

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const messages = body.messages.slice(-20).map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(m.content).slice(0, 4000),
  }));

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI Helpdesk is not configured yet — missing ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      output_config: { effort: "medium" },
      messages,
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );

    return NextResponse.json({ reply: textBlock?.text ?? "" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI request failed" },
      { status: 502 },
    );
  }
}
