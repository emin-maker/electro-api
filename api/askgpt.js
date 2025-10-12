import OpenAI from "openai";

export const config = {
  runtime: "nodejs20.x",
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Vercel Body Parse Fix
    const body = await req.text();
    const data = JSON.parse(body || "{}");
    const question = data.question || "";

    if (!question) {
      return new Response(
        JSON.stringify({ error: "No question provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un satış danışmanısın. Kullanıcıya beyaz eşya, elektronik ve ev aletleri hakkında doğal, samimi, kısa ve yardımcı tavsiyeler ver.",
        },
        { role: "user", content: question },
      ],
    });

    const answer = completion.choices[0].message.content;
    return new Response(
      JSON.stringify({ answer }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("GPT Error:", err);
    return new Response(
      JSON.stringify({ error: "GPT error", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
