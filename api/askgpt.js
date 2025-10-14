export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "No question provided" });
  }

  try {
    // 🔹 1. Ürün verisini al (senin feed’in)
    const response = await fetch("https://www.electrobeyazshop.com/outputxml/index.php?xml_service_id=11");
    const xmlText = await response.text();
    const match = xmlText.match(/\{.*\}/s);
    if (!match) return res.status(500).json({ error: "XML verisi alınamadı." });

    const jsonData = JSON.parse(match[0]);
    const products = jsonData.products || [];

    // 🔹 2. Türkçe karakterleri normalize et
    const normalize = (str) =>
      str
        ?.toLowerCase()
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .trim();

    const query = normalize(question);

    // 🔹 3. Akıllı skor tabanlı eşleşme (marka + kategori + isim ağırlığı)
    const results = products
      .map((p) => {
        const combined = normalize(`${p.name} ${p.productBrand} ${p.productCategory}`);
        let score = 0;

        if (combined.includes(query)) score += 5;
        if (normalize(p.productBrand)?.includes(query)) score += 3;
        if (normalize(p.productCategory)?.includes(query)) score += 3;
        if (normalize(p.name)?.includes(query)) score += 2;

        return { ...p, score };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score);

    // 🔹 4. Fallback öneri (aynı kategori/benzer ürün)
    let finalProducts = results.slice(0, 4);
    if (finalProducts.length === 0) {
      // benzer kategoriden öner
      const commonCategory = products.filter((p) =>
        normalize(p.productCategory)?.includes("makine") ||
        normalize(p.productCategory)?.includes("buzdolabi") ||
        normalize(p.productCategory)?.includes("dondurucu")
      );
      finalProducts = commonCategory.slice(0, 3);
    }

    // 🔹 5. HTML formatlı çıktı
    let htmlOutput = "";

    if (finalProducts.length === 0) {
      htmlOutput = `
        <div class="chat-message bot">
          <p>Üzgünüm, aradığınız özellikte ürün bulunamadı. Farklı bir marka veya kapasiteyle tekrar deneyin.</p>
        </div>`;
    } else {
      htmlOutput += `<div class="chat-message bot"><p>İşte sizin için uygun ürünler 👇</p></div>`;
      htmlOutput += `<div class="product-list">`;
      finalProducts.forEach((p) => {
        htmlOutput += `
          <div class="product-card">
            <img src="${p.imgUrl}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p><strong>Marka:</strong> ${p.productBrand}</p>
            <p><strong>Fiyat:</strong> ${p.price} ${p.kur}</p>
            <a href="${p.url}" target="_blank">🔗 Ürüne Git</a>
          </div>
        `;
      });
      htmlOutput += `</div>`;
    }

    return res.json({ htmlOutput });
  } catch (error) {
    console.error("API Hatası:", error);
    return res.status(500).json({ error: "Veri işlenirken hata oluştu." });
  }
}
