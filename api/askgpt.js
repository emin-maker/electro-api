import OpenAI from "openai";

export const config = {
  runtime: "nodejs20.x",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { question } = req.body;

    if (!question || question.trim() === "") {
      return res.status(400).json({ error: "No question provided" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop’un dijital asistanısın. Kullanıcıya beyaz eşya, kampanya, ürün ve stok bilgileri hakkında yardımcı ol. Açıklamaları doğal ve samimi bir dille yap.",
        },
        { role: "user", content: question },
      ],
    });

    res.status(200).json({
      answer: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("API hatası:", error);
    res
      .status(500)
      .json({ error: "Sunucuya bağlanırken hata oluştu.", details: error.message });
  }
}
