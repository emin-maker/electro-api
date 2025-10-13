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

    // 🔹 1. Ürün verisini çek
    const searchUrl = `https://electro-api-swart.vercel.app/api/products?q=${encodeURIComponent("")}`;
    const productsResponse = await fetch(searchUrl);
    const productData = await productsResponse.json();

    // 🔹 2. GPT’ye anlamlı bir ürün listesi oluştur
    const allProducts = productData.products
      .slice(0, 100) // ilk 100 ürünü al (fazlasına gerek yok)
      .map(
        (p) =>
          `• ${p.name} (${p.productBrand}) - ${p.productCategory} - ${p.price} ${p.kur} (${p.url})`
      )
      .join("\n");

    // 🔹 3. GPT’ye ürünleri verip sorgu eşleştirmesini yaptır
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Sen Electro Beyaz Shop'un ürün asistanısın.
Aşağıda mağazadaki ürün listesi var. Kullanıcı bir şey sorduğunda, listedeki en uygun ürün(ler)i anlamına göre bul ve öner.
Cevapta fiyat, marka ve linki mutlaka ver. Ürün yoksa benzer alternatif sun.`,
        },
        {
          role: "user",
          content: `Kullanıcı sorusu: "${question}"\n\nÜrün listesi:\n${allProducts}`,
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
