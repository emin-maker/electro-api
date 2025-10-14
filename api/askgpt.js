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
    const client = new OpenAI({ apiKey: process.env.Electro_Asistan });
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "No question provided" });

    // 1️⃣ GPT ile sadeleştir
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

    let keyword = condense.choices[0].message.content.trim().toLowerCase();

    // 2️⃣ Anahtar kelime eş anlamlı genişletme
    const synonyms = {
      "kurutma makinesi": [
        "çamaşır kurutma makinesi",
        "kurutucu",
        "kurutma cihazı",
        "çamaşır kurutucu",
      ],
      "buzdolabı": ["no frost buzdolabı", "çift kapılı buzdolabı"],
      "derin dondurucu": ["çekmeceli dondurucu", "dikey dondurucu"],
      "ütü": ["buharlı ütü", "dikey ütü", "ütü makinesi"],
    };

    const extraQueries = synonyms[keyword] || [];
    const queries = [keyword, ...extraQueries];

    // 3️⃣ API’den ürünleri ara (her kelime için)
    let allProducts = [];
    for (const q of queries) {
      const url = `https://electro-api-swart.vercel.app/api/products?q=${encodeURIComponent(q)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data?.products?.length) allProducts.push(...data.products);
    }

    // 4️⃣ Ürünleri işleme al
    let htmlOutput = "";
    if (allProducts.length > 0) {
      const uniqueProducts = Object.values(
        allProducts.reduce((acc, p) => {
          acc[p.sku] = p;
          return acc;
        }, {})
      );

      const sorted = uniqueProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      htmlOutput = sorted
        .slice(0, 5)
        .map(
          (p) => `
          <div style="border:1px solid #ddd; border-radius:12px; padding:12px; margin:10px 0; box-shadow:0 2px 6px rgba(0,0,0,0.08); max-width:95%;">
            <img src="${p.imgUrl}" alt="${p.name}" style="width:100%; max-width:250px; border-radius:10px; margin-bottom:10px;">
            <h3 style="margin:5px 0; font-size:16px;">${p.name}</h3>
            <p><b>Fiyat:</b> ${p.price} ${p.kur}</p>
            <p><b>Marka:</b> ${p.productBrand}</p>
            <p><b>Kategori:</b> ${p.productCategory}</p>
            <a href="${p.url}" target="_blank" style="display:inline-block; background:#0078ff; color:white; text-decoration:none; padding:6px 12px; border-radius:6px;">🔗 Ürüne Git</a>
          </div>`
        )
        .join("");
    } else {
      htmlOutput = `
      <p>Üzgünüm, aradığınız ürün stokta bulunamadı.  
      Ancak benzer ürünleri önermek isterim.  
      Dilersen farklı bir marka veya kapasiteyle tekrar deneyin.</p>`;
    }

    // 5️⃣ GPT ile doğal yanıt oluştur
    const gptResponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un akıllı satış asistanısın. Kullanıcıya doğal bir dille uygun ürünleri tanıt, ardından HTML ürün listesini ekle.",
        },
        {
          role: "user",
          content: `Kullanıcı: ${question}\n\nÜrün listesi (HTML):\n${htmlOutput}`,
        },
      ],
    });

    const answer = gptResponse.choices[0].message.content;
    res.status(200).json({ answer, htmlOutput, keyword, queries });
  } catch (error) {
    console.error("Asistan hata:", error);
    res.status(500).json({ error: "Asistan yanıt veremedi.", details: error.message });
  }
}
