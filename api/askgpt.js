import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  runtime: "edge", // Vercel edge function olarak çalışsın
};

export default async function handler(req) {
  try {
    const { question } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: "No question provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un satış danışmanısın. Kullanıcıya beyaz eşya, elektronik ve ev aletleri hakkında doğal, samimi ve kısa tavsiyeler ver.",
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
    return new Response(
      JSON.stringify({ error: "GPT error", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
