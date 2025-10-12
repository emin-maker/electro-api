import OpenAI from "openai";

export default async function handler(req, res) {
  // Sadece POST isteklerini kabul et
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Gelen veriyi JSON olarak al
    const { question } = req.body || {};

    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    // OpenAI istemcisini oluştur
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // GPT'den yanıt al
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un satış danışmanısın. Kullanıcıya beyaz eşya, elektronik ve ev aletleri hakkında samimi, kısa ve yardımcı cevaplar ver.",
        },
        { role: "user", content: question },
      ],
    });

    const answer = completion.choices[0].message.content;
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("GPT Error:", err);
    return res
      .status(500)
      .json({ error: "GPT error", details: err.message });
  }
}
