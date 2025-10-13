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

    // 1️⃣ Ürünleri getir
    const searchUrl = `https://electro-api-swart.vercel.app/api/products?q=${encodeURIComponent(
      question
    )}`;
    const productsResponse = await fetch(searchUrl);
    const productData = await productsResponse.json();

    // 2️⃣ Eğer ürün varsa GPT’ye kısa bir özet hazırla
    let productSummary = "Uygun ürün bulunamadı.";
    if (productData.count > 0) {
      const list = productData.products
        .slice(0, 5)
        .map(
          (p) =>
            `- ${p.name} (${p.productBrand}) – ${p.price} ${p.kur}. [Ürüne Git](${p.url})`
        )
        .join("\n");
      productSummary = `Bulunan ${productData.count} ürün:\n${list}`;
    }

    // 3️⃣ GPT'yi çalıştır
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un akıllı ürün asistanısın. Kullanıcıya beyaz eşya, fiyat, marka, stok ve kampanya bilgilerini doğal bir dille anlat. Eğer birden fazla ürün varsa tablo veya madde listesiyle sun. Kullanıcıyı sitedeki ürün linklerine yönlendir.",
        },
        {
          role: "user",
          content: `Soru: ${question}\n\nÜrün verisi:\n${productSummary}`,
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
