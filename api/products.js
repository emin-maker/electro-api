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

    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(xmlText);

    // Hatalı parse’ı anlamak için debug ekleyelim
    console.log(Object.keys(data));
    res.status(200).json({
      keys: Object.keys(data),
      sample: JSON.stringify(data).slice(0, 2000) // ilk 2000 karakter
    });
  } catch (err) {
    console.error("XML hata:", err);
    res.status(500).json({ error: "XML verisi alınamadı veya çözümlenemedi." });
  }
}
