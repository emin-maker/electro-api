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
    const client = new OpenAI({ apiKey: process.env.EBS_Key });
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "No question provided" });

    // 1️⃣ Anahtar kelimeyi kısalt
    const condense = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Kullanıcı ürün arıyor. Cümledeki marka ve ürün tipini çıkar (örneğin: Uğur dondurucu, Siemens buzdolabı).",
        },
        { role: "user", content: question },
      ],
    });

    const keyword = condense.choices[0].message.content.trim();

    // 2️⃣ Ürünleri getir
    const searchUrl = `https://electro-api-swart.vercel.app/api/products?q=${encodeURIComponent(keyword)}`;
    const productsResponse = await fetch(searchUrl);
    const productData = await productsResponse.json();

    let productSummary = "Uygun ürün bulunamadı.";
    if (productData.count > 0) {
      // Ürünleri fiyat sırasına göre sırala
      const sorted = productData.products.sort(
        (a, b) => parseFloat(a.price) - parseFloat(b.price)
      );

      const list = sorted
        .slice(0, 5)
        .map(
          (p) =>
            `• ${p.name} (${p.productBrand}) – ${p.price} ${p.kur}. [Ürüne Git](${p.url})`
        )
        .join("\n");

      productSummary = `Bulunan ${productData.count} ürün:\n${list}`;
    }

    // 3️⃣ GPT cevabı oluştur
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un satış asistanısın. Ürün listesini analiz et, kullanıcıya en uygun veya en ucuz ürünü öner. Cevapta fiyat, marka ve link mutlaka olsun. Ürün yoksa benzer alternatifler sun.",
        },
        {
          role: "user",
          content: `Kullanıcı: ${question}\n\nÜrün verisi:\n${productSummary}`,
        },
      ],
    });

    const answer = response.choices[0].message.content;
    res.status(200).json({ answer, keyword });
  } catch (error) {
    console.error("Asistan hata:", error);
    res.status(500).json({ error: "Asistan yanıt veremedi." });
  }
}
