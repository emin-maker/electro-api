export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "No question provided" });
  }

  try {
    // Ürün datasını JSON kaynağından al
    const response = await fetch("https://www.electrobeyazshop.com/outputxml/index.php?xml_service_id=11");
    const xmlText = await response.text();

    // XML'den JSON’a çevir
    const match = xmlText.match(/\{.*\}/s);
    if (!match) return res.status(500).json({ error: "XML verisi alınamadı." });

    const jsonData = JSON.parse(match[0]);
    const products = jsonData.products || [];

    // Türkçe karakterleri normalize eden fonksiyon
    const normalize = (str) =>
      str
        .toLowerCase()
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c");

    const userQuery = normalize(question);

    // Ürün arama (isim, kategori, marka)
    const filtered = products.filter((p) => {
      const text = normalize(`${p.name} ${p.productBrand} ${p.productCategory}`);
      return text.includes(userQuery);
    });

    if (filtered.length === 0) {
      return res.json({
        answer:
          "Üzgünüm, aradığınız özellikte ürün bulunamadı. Farklı bir marka veya kapasiteyle tekrar deneyin.",
      });
    }

    // En fazla 3 ürün göster
    const topProducts = filtered.slice(0, 3);
    let htmlOutput = "<div>";

    topProducts.forEach((p) => {
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

    htmlOutput += "</div>";

    return res.json({ htmlOutput });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Veri işlenirken hata oluştu." });
  }
}
