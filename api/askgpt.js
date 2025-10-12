import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 🔧 Body'yi manuel oku (Vercel req.body vermiyor)
    let body = "";
    await new Promise((resolve, reject) => {
      req.on("data", chunk => (body += chunk));
      req.on("end", resolve);
      req.on("error", reject);
    });

    const data = body ? JSON.parse(body) : {};
    const question = data.question || "";

    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    // ✅ OpenAI istemcisini oluştur
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // ✅ ChatGPT'den yanıt iste
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un yapay zekâ satış danışmanısın. Kullanıcıya beyaz eşya, elektronik ve ev aletleri hakkında doğal, kısa, samimi ve yardımcı cevaplar ver.",
        },
        { role: "user", content: question },
      ],
    });

    const answer = completion.choices[0].message.content;
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("⚠️ GPT Error:", err);
    return res.status(500).json({
      error: "GPT error",
      details: err.message,
    });
  }
}
