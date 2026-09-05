import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";

const SYSTEM_PROMPT = `You are the Smart Campus AI Helpdesk, a general assistant for a college's students and staff.

You do NOT currently have access to this specific college's official documents, policies, academic calendar, or FAQs — that knowledge base has not been connected yet. So:
- If asked about this college's specific rules, deadlines, fees, contact details, exam schedules, or any institution-specific fact, say plainly that you don't have that information yet and suggest they check with the relevant department or official notice board. Never invent a specific policy, date, name, or number.
- For general educational questions (explaining a concept, study help, general academic guidance), answer normally and helpfully using your own knowledge.
Keep answers concise and clear.`;

const GEMINI_MODEL = "gemini-3.6-flash";

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
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content).slice(0, 4000) }],
  }));

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "AI Helpdesk is not configured yet — missing GEMINI_API_KEY." },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: messages,
          generationConfig: {
            maxOutputTokens: 1024,
            thinkingConfig: { thinkingLevel: "LOW" },
          },
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        { error: `Gemini request failed (${res.status}): ${errBody.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const reply: string =
      data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
      "";

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI request failed" },
      { status: 502 },
    );
  }
}
