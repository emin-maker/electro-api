import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sen Electro Beyaz Shop’un müşteri asistanısın. Kullanıcılara ürün, kampanya, stok ve beyaz eşya önerisi hakkında yardımcı ol." },
        { role: "user", content: question },
      ],
    });

    res.status(200).json({
      answer: response.choices[0].message.content,
    });
  } catch (error) {
    console.error("OpenAI API hatası:", error);
    res.status(500).json({ error: "Sunucuya bağlanırken hata oluştu." });
  }
}
