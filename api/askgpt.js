import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { question } = await req.body
      ? await new Response(req.body).json()
      : { question: "" };

    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un yapay zekâ satış danışmanısın. Kullanıcıya beyaz eşya, elektronik ve ev aletleri hakkında kısa, doğal, güven verici şekilde yardımcı ol.",
        },
        { role: "user", content: question },
      ],
    });

    const answer = completion.choices[0].message.content;
    res.status(200).json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "GPT error", details: err.message });
  }
}
