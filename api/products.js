import xml2js from "xml2js";

export const config = {
  runtime: "nodejs",
  maxDuration: 60, // 1 dakikaya kadar izin ver
};

export default async function handler(req, res) {
  const xmlUrl = "https://www.electrobeyazshop.com/outputxml/index.php?xml_service_id=11";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    const response = await fetch(xmlUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(500).json({ error: "Sunucu XML yanıtı alınamadı." });
    }

    const xmlText = await response.text();

    // XML içeriğini çözümle
    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(xmlText);

    const products = data?.rss?.channel?.item || [];
    const q = req.query.q?.toLowerCase() || "";

    const filtered = products.filter((p) => {
      const title = p["g:title"]?.toLowerCase() || "";
      const brand = p["g:brand"]?.toLowerCase() || "";
      return title.includes(q) || brand.includes(q);
    });

    res.status(200).json({
      count: filtered.length,
      products: filtered.slice(0, 10),
    });
  } catch (err) {
    console.error("XML hata:", err);
    res.status(500).json({ error: "XML verisi alınamadı veya zaman aşımı oldu." });
  }
}
