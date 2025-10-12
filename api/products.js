export default async function handler(req, res) {
  const xmlUrl =
    "https://api.allorigins.win/raw?url=https://www.electrobeyazshop.com/outputxml/index.php?xml_service_id=11";

  try {
    const response = await fetch(xmlUrl);
    const text = await response.text();

    // sadece çıktıyı görmek için
    res.status(200).send(text);
  } catch (err) {
    console.error("XML hata:", err);
    res.status(500).json({ error: "XML verisi alınamadı." });
  }
}
