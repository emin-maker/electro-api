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

    // 1️⃣ Kullanıcı sorgusuna göre ürünleri çek
    const searchUrl = `https://electro-api-swart.vercel.app/api/products?q=${encodeURIComponent(
      question
    )}`;
    const productsResponse = await fetch(searchUrl);
    const productData = await productsResponse.json();

    let productSummary = "Uygun ürün bulunamadı.";
    if (productData.count > 0) {
      const first = productData.products[0];
      productSummary = `Bulunan ürün: ${first.name} – ${first.price} ${first.kur}. Marka: ${first.productBrand}. Kategori: ${first.productCategory}.`;
    }

    // 2️⃣ GPT cevabı oluştur
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop’un ürün asistanısın. Kullanıcıya beyaz eşya, kampanya, fiyat ve stok hakkında yardımcı ol. Ürün verilerini sana 'productSummary' değişkeniyle veriyorum, bunları cevabında kullan.",
        },
        {
          role: "user",
          content: `Soru: ${question}\nÜrün verisi: ${productSummary}`,
        },
      ],
    });

    const answer = response.choices[0].message.content;
    res.status(200).json({ answer, productData });
  } catch (error) {
    console.error("Asistan hata:", error);
    res.status(500).json({ error: "Asistan yanıt veremedi." });
  }
}
