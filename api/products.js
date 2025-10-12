import xml2js from "xml2js";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

export default async function handler(req, res) {
  const xmlUrl = "https://www.electrobeyazshop.com/outputxml/index.php?xml_service_id=11";

  try {
    const response = await fetch(xmlUrl);
    const xmlText = await response.text();

    // XML'i JSON’a çevir
    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(xmlText);

    const products = data?.products?.product || [];

    const q = req.query.q?.toLowerCase() || "";

    const filtered = products.filter((p) => {
      const name = p.name?.toLowerCase() || "";
      const brand = p.productBrand?.toLowerCase() || "";
      return name.includes(q) || brand.includes(q);
    });

    res.status(200).json({
      count: filtered.length,
      products: filtered.slice(0, 10),
    });
  } catch (err) {
    console.error("XML hata:", err);
    res.status(500).json({ error: "XML verisi alınamadı veya çözümlenemedi." });
  }
}
