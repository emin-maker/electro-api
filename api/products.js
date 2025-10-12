import xml2js from "xml2js";

export default async function handler(req, res) {
  const xmlUrl = "https://www.electrobeyazshop.com/outputxml/index.php?xml_service_id=11";

  try {
    const response = await fetch(xmlUrl);
    const xmlText = await response.text();

    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(xmlText);

    const products = data.rss.channel.item;

    // Kullanıcı sorgusu
    const q = req.query.q?.toLowerCase() || "";

    // Filtreleme (ürün adı ve marka üzerinden)
    const filtered = products.filter((p) => {
      const title = p["g:title"]?.toLowerCase() || "";
      const brand = p["g:brand"]?.toLowerCase() || "";
      return title.includes(q) || brand.includes(q);
    });

    res.status(200).json({
      count: filtered.length,
      products: filtered.slice(0, 10), // ilk 10 ürünü döndür
    });
  } catch (err) {
    console.error("XML hata:", err);
    res.status(500).json({ error: "XML verisi alınamadı." });
  }
}
