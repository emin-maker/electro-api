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
    if (!question)
      return res.status(400).json({ error: "No question provided" });

    // 1️⃣ Anahtar kelimeyi basitleştir
    const condense = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Kullanıcının cümlesinden sadece marka ve ürün tipini çıkar. Örnek: 'uğur 7 çekmeceli derin dondurucu' → 'uğur derin dondurucu'",
        },
        { role: "user", content: question },
      ],
    });

    const keyword = condense.choices[0].message.content.trim();

    // 2️⃣ XML feed'den ürünleri getir
    const searchUrl = `https://electro-api-swart.vercel.app/api/products?q=${encodeURIComponent(
      keyword
    )}`;
    const productsResponse = await fetch(searchUrl);
    const productData = await productsResponse.json();

    // 3️⃣ Ürünleri fiyat sırasına göre sırala
    let htmlOutput = "";
    if (productData.count > 0) {
      const sorted = productData.products.sort(
        (a, b) => parseFloat(a.price) - parseFloat(b.price)
      );

      htmlOutput = sorted
        .slice(0, 5)
        .map(
          (p) => `
          <div style="border:1px solid #ddd; border-radius:12px; padding:16px; margin:10px 0; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
            <img src="${p.imgUrl}" alt="${p.name}" style="width:100%; max-width:300px; border-radius:10px; margin-bottom:10px;">
            <h3 style="margin:5px 0;">${p.name}</h3>
            <p style="margin:3px 0;"><strong>Fiyat:</strong> ${p.price} ${p.kur}</p>
            <p style="margin:3px 0;"><strong>Marka:</strong> ${p.productBrand}</p>
            <p style="margin:3px 0;"><strong>Kategori:</strong> ${p.productCategory}</p>
            <a href="${p.url}" target="_blank" style="display:inline-block; background:#0078ff; color:white; text-decoration:none; padding:8px 14px; border-radius:6px; margin-top:8px;">🔗 Ürüne Git</a>
          </div>`
        )
        .join("");
    } else {
      htmlOutput =
        "<p>Üzgünüm, aradığınız özellikte ürün bulunamadı. Farklı bir marka veya kapasiteyle tekrar deneyin.</p>";
    }

    // 4️⃣ GPT’den doğal konuşma + HTML cevabı
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un akıllı satış asistanısın. Kullanıcıya uygun ürünleri doğal bir dille anlat, ardından HTML formatında listele.",
        },
        {
          role: "user",
          content: `Kullanıcı: ${question}\n\nÜrün kartları (HTML):\n${htmlOutput}`,
        },
      ],
    });

    const answer = response.choices[0].message.content;
    res.status(200).json({ answer, htmlOutput, keyword });
  } catch (error) {
    console.error("Asistan hata:", error);
    res.status(500).json({ error: "Asistan yanıt veremedi." });
  }
}
