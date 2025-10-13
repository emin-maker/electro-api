import OpenAI from "openai";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.EBS_Key,
    });

    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    // 🔹 Kullanıcının aradığı kelimeye göre ürünleri filtrele
    const searchUrl = `https://electro-api-swart.vercel.app/api/products?q=${encodeURIComponent(
      question
    )}`;
    const productsResponse = await fetch(searchUrl);
    const productData = await productsResponse.json();

    const allProducts = productData.products
      .slice(0, 100)
      .map(
        (p) =>
          `• ${p.name} (${p.productBrand}) - ${p.productCategory} - ${p.price} ${p.kur} - ${p.url}`
      )
      .join("\n");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Sen Electro Beyaz Shop'un akıllı satış asistanısın.
Kullanıcının sorduğu markayı, model özelliklerini ve kelimeleri anlayarak listedeki ürünlerle eşleştir.
Eğer doğrudan o marka yoksa benzer markadan öneriler yap.
Cevapta fiyat, marka ve linki mutlaka belirt.`,
        },
        {
          role: "user",
          content: `Kullanıcı sorusu: "${question}"\n\nUygun ürün listesi:\n${allProducts}`,
        },
      ],
    });

    const answer = response.choices[0].message.content;
    res.status(200).json({ answer });
  } catch (error) {
    console.error("Asistan hata:", error);
    res.status(500).json({ error: "Asistan yanıt veremedi." });
  }
}
