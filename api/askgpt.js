import OpenAI from "openai";

export const config = {
  runtime: "nodejs", // ✅ doğru runtime
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Body verisini oku (Vercel req.json desteklemiyor)
    const rawBody = await req.text();
    const data = rawBody ? JSON.parse(rawBody) : {};
    const question = data.question || "";

    if (!question) {
      return new Response(
        JSON.stringify({ error: "No question provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ OpenAI istemcisi
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // ✅ GPT'den yanıt al
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un yapay zekâ satış danışmanısın. Kullanıcıya beyaz eşya, elektronik ve ev aletleri hakkında doğal, samimi ve kısa tavsiyeler ver.",
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
