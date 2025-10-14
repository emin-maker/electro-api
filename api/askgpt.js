// ================================
// 🚀 ELECTRO ASİSTAN v4 (CACHE + GPT + HATA RAPORLU)
// ================================

// Bellek içi cache (1 saat)
let cache = {
  data: null,
  timestamp: 0,
  ttl: 3600 * 1000,
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
    // 1️⃣ CACHE KONTROLÜ
    const now = Date.now();
    let jsonData = null;

    if (cache.data && now - cache.timestamp < cache.ttl) {
      console.log("🧠 Cache kullanıldı (1 saat içinde).");
      jsonData = cache.data;
    } else {
      console.log("🌐 Yeni XML verisi çekiliyor...");
      const response = await fetch("https://www.electrobeyazshop.com/outputxml/index.php?xml_service_id=11");
      const xmlText = await response.text();

      try {
        const match = xmlText.match(/\{.*\}/s);
        if (match) {
          jsonData = JSON.parse(match[0]);
          cache.data = jsonData;
          cache.timestamp = now;
          console.log("✅ Cache güncellendi.");
        } else {
          console.warn("⚠️ XML içinde JSON formatı bulunamadı!");
        }
      } catch (err) {
        console.error("⚠️ JSON çözümleme hatası:", err);
      }
    }

    // 2️⃣ DATA KONTROLÜ
    if (!jsonData || !jsonData.products || jsonData.products.length === 0) {
      console.log("❌ Veri bulunamadı. GPT fallback aktif.");
      const aiAnswer = await getAIResponse(question);
      return res.json({ htmlOutput: aiAnswer });
    }

    const products = jsonData.products || [];

    // 3️⃣ SORUYU NORMALİZE ET
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

    // 4️⃣ AKILLI ARAMA SKORU
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

    // 5️⃣ SONUÇ YOKSA GPT'YE GİT
    if (results.length === 0) {
      console.log("🔍 Eşleşme bulunamadı, GPT fallback aktif.");
      const aiAnswer = await getAIResponse(question);
      return res.json({ htmlOutput: aiAnswer });
    }

    // 6️⃣ ÜRÜNLERİ HTML HALİNE GETİR
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
    console.error("🔥 API genel hatası:", error);
    const aiAnswer = await getAIResponse(question);
    return res.json({ htmlOutput: aiAnswer });
  }
}

// ================================
// 🧠 OPENAI FALLBACK (AKILLI ASİSTAN)
// ================================
async function getAIResponse(question) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.EBS_Key;

  if (!OPENAI_KEY) {
    console.error("❌ API key bulunamadı (OPENAI_API_KEY veya EBS_Key tanımlı değil).");
    return `<div class="chat-message bot"><p>⚠️ OpenAI anahtarı tanımlı değil. Lütfen sistem yöneticinize bildirin.</p></div>`;
  }

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sen Electro Asistan’sın. Kullanıcıya beyaz eşya önerileri sunuyorsun. Ürün bulamazsan öneriler ve ipuçları ver. Samimi ama profesyonel bir dil kullan.",
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

    let answer = "Üzgünüm, şu anda yardımcı olamıyorum.";
    if (data?.choices?.[0]?.message?.content) {
      answer = data.choices[0].message.content;
    } else if (data?.error?.message) {
      answer = `⚠️ OpenAI Hatası: ${data.error.message}`;
    } else {
      answer = "⚙️ Bağlantı sorunu yaşanıyor. Lütfen tekrar deneyin.";
    }

    return `<div class="chat-message bot"><p>${answer}</p></div>`;
  } catch (error) {
    console.error("OpenAI fallback hatası:", error);
    return `<div class="chat-message bot"><p>⚠️ Sistem şu anda yanıt veremiyor. Lütfen tekrar deneyin.</p></div>`;
  }
}
