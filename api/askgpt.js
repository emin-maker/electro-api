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
      apiKey: process.env.Electro_Asistan,
    });

    const { question } = req.body;
    if (!question)
      return res.status(400).json({ error: "No question provided" });

    // 1️⃣ Kullanıcının sorgusunu sadeleştir
    const condense = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Kullanıcının cümlesinden sadece ürün tipi ve marka çıkar. Örnek: 'Bosch 9 kg çamaşır makinesi' → 'Bosch çamaşır makinesi'.",
        },
        { role: "user", content: question },
      ],
    });

    const keyword = condense.choices?.[0]?.message?.content?.trim() || "";

    // 2️⃣ XML feed’den ürünleri getir
    const searchUrl = `https://electro-api-swart.vercel.app/api/products?q=${encodeURIComponent(
      keyword
    )}`;
    const productsResponse = await fetch(searchUrl);
    const productData = await productsResponse.json();

    let htmlOutput = "";
    let productCount = productData?.count || 0;

    // 3️⃣ Ürün varsa listele, yoksa boş bırak
    if (productCount > 0) {
      const sorted = productData.products.sort(
        (a, b) => parseFloat(a.price) - parseFloat(b.price)
      );

      htmlOutput = sorted
        .slice(0, 5)
        .map(
          (p) => `
          <div style="border:1px solid #ddd; border-radius:10px; padding:10px; margin:8px 0; box-shadow:0 2px 6px rgba(0,0,0,0.1); max-width:420px;">
            <img src="${p.imgUrl}" alt="${p.name}" style="width:100%; max-width:200px; border-radius:8px; margin-bottom:8px;">
            <h3 style="margin:4px 0;">${p.name}</h3>
            <p style="margin:2px 0;"><strong>Fiyat:</strong> ${p.price} ${p.kur}</p>
            <p style="margin:2px 0;"><strong>Marka:</strong> ${p.productBrand}</p>
            <p style="margin:2px 0;"><strong>Kategori:</strong> ${p.productCategory}</p>
            <a href="${p.url}" target="_blank" style="display:inline-block; background:#0078ff; color:white; text-decoration:none; padding:6px 10px; border-radius:6px; margin-top:5px;">🔗 Ürüne Git</a>
          </div>`
        )
        .join("");
    }

    // 4️⃣ Fallback konuşma senaryosu
    let fallbackMessage = "";
    const lowerQ = question.toLowerCase();

    if (productCount === 0) {
      if (
        lowerQ.includes("bozuldu") ||
        lowerQ.includes("çalışmıyor") ||
        lowerQ.includes("arıza")
      ) {
        fallbackMessage =
          "Geçmiş olsun! Çamaşır makineniz arızalandıysa yerine yeni bir model seçebiliriz. Size uygun birkaç çamaşır makinesi önerisi getireyim mi?";
      } else {
        fallbackMessage =
          "Üzgünüm, aradığınız özellikte ürün bulunamadı. Farklı bir marka veya kapasiteyle tekrar deneyebilirsiniz.";
      }
    }

    // 5️⃣ GPT ile doğal dille cevap oluştur
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un akıllı satış asistanısın. Kullanıcıya sıcak, doğal ve satış odaklı yanıtlar ver. Ürün varsa öne çıkar, yoksa alternatif öner veya empatik konuş.",
        },
        {
          role: "user",
          content: `Kullanıcı: ${question}\n\nÜrün Sayısı: ${productCount}\nFallback: ${fallbackMessage}\n\nÜrünler (HTML):\n${htmlOutput}`,
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
