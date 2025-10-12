import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    // 🔧 Body'yi düzgün al (bazı Vercel ortamlarında req.body undefined olur)
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers).toString();
    const data = rawBody ? JSON.parse(rawBody) : {};
    const question = data.question || "";

    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

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
    res.status(200).json({ answer });
  } catch (err) {
    console.error("GPT error:", err);
    res.status(500).json({ error: "GPT error", details: err.message });
  }
}
