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

    // 🧠 1️⃣ GPT'den kısa arama anahtar kelimesi iste
    const condense = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Kullanıcı ürün arıyor. Cümledeki marka (örneğin Uğur, Siemens, Altus) ve ürün tipi (örneğin buzdolabı, dondurucu, çamaşır makinesi) kelimelerini ayıkla ve kısa anahtar kelime olarak ver.",
        },
        { role: "user", content: question },
      ],
    });

    const keyword = condense.choices[0].message.content.trim();
    console.log("🔍 Arama anahtar kelimesi:", keyword);

    // 🛒 2️⃣ XML feed'den ürün çek
    const searchUrl = `https://electro-api-swart.vercel.app/api/products?q=${encodeURIComponent(keyword)}`;
    const productsResponse = await fetch(searchUrl);
    const productData = await productsResponse.json();

    // 🧾 3️⃣ Ürünleri GPT'ye özetle
    let productSummary = "Uygun ürün bulunamadı.";
    if (productData.count > 0) {
      const list = productData.products
        .slice(0, 5)
        .map(
          (p) =>
            `• ${p.name} (${p.productBrand}) – ${p.price} ${p.kur}. [Ürüne Git](${p.url})`
        )
        .join("\n");
      productSummary = `Bulunan ${productData.count} ürün:\n${list}`;
    }

    // 🤖 4️⃣ GPT’den akıllı yanıt al
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Electro Beyaz Shop'un satış asistanısın. Ürün listesini analiz et, kullanıcının isteğine uygun ürünleri öner. Cevabında fiyat, marka ve link mutlaka olsun.",
        },
        {
          role: "user",
          content: `Kullanıcı: ${question}\nÜrün Verisi:\n${productSummary}`,
        },
      ],
    });

    const answer = response.choices[0].message.content;
    res.status(200).json({ answer, keyword, productData });
  } catch (error) {
    console.error("Asistan hata:", error);
    res.status(500).json({ error: "Asistan yanıt veremedi." });
  }
}
