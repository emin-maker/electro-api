// ================================
// 🚀 ELECTRO ASİSTAN v3 (Cache Destekli)
// ================================

// Bellek içi cache (1 saat süreyle)
let cache = {
  data: null,
  timestamp: 0,
  ttl: 3600 * 1000, // 1 saat
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "No question provided" });
  }

  try {
    // 1️⃣ Cache kontrolü
    const now = Date.now();
    let jsonData = null;

    if (cache.data && now - cache.timestamp < cache.ttl) {
      console.log("🧠 Cache kullanıldı (hızlı mod)");
      jsonData = cache.data;
    } else {
      console.log("🌐 Yeni veri çekiliyor...");
      const response = await fetch("https://www.electrobeyazshop.com/outputxml/index.php?xml_service_id=11");
      const xmlText = await response.text();

      // JSON parse güvenli
      try {
        const match = xmlText.match(/\{.*\}/s);
        if (match) {
          jsonData = JSON.parse(match[0]);
          // Cache’e kaydet
          cache.data = jsonData;
          cache.timestamp = now;
          console.log("✅ Cache güncellendi.");
        } else {
          console.warn("⚠️ JSON formatı bulunamadı!");
        }
      } catch (err) {
        console.error("JSON çözümleme hatası:", err);
      }
    }

    // Eğer veri yoksa OpenAI fallback
    if (!jsonData || !jsonData.products || jsonData.products.length === 0) {
      console.log("❌ Veri bulunamadı, OpenAI fallback aktif.");
      const aiAnswer = await getAIResponse(question);
      return res.json({ htmlOutput: aiAnswer });
    }

    const products = jsonData.products || [];

    // 2️⃣ Arama
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

    // 3️⃣ Sonuç yoksa OpenAI fallback
    if (results.length === 0) {
      const aiAnswer = await getAIResponse(question);
      return res.json({ htmlOutput: aiAnswer });
    }

    // 4️⃣ HTML oluştur
    const topProducts = results.slice(0, 4);
    let htmlOutput = `
      <div class="chat-message bot"><p>İşte size uygun ürünler 👇</p></div>
      <div class="product-list">
    `;

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

    htmlOutput += `</div>`;
    return res.json({ htmlOutput });
  } catch (error) {
    console.error("API genel hatası:", error);
    const aiAnswer = await getAIResponse(question);
    return res.json({ htmlOutput: aiAnswer });
  }
}

// ================================
// 🧠 OPENAI FALLBACK FONKSİYONU
// ================================
async function getAIResponse(question) {
  try {
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sen Electro Asistan’sın. Kullanıcıya beyaz eşya tavsiyesi veriyorsun. Samimi ama profesyonel bir dille konuş. Eğer ürün bulunmazsa, öneri ve ipucu ver.",
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await aiResponse.json();
    const answer = data?.choices?.[0]?.message?.content || "Üzgünüm, şu anda yardımcı olamıyorum.";
    return `<div class="chat-message bot"><p>${answer}</p></div>`;
  } catch (error) {
    console.error("OpenAI fallback hatası:", error);
    return `<div class="chat-message bot"><p>⚠️ Bir hata oluştu, lütfen tekrar deneyin.</p></div>`;
  }
}
