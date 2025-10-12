export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

export default async function handler(req, res) {
  const xmlUrl = "https://www.electrobeyazshop.com/outputxml/index.php?xml_service_id=11";

  try {
    const response = await fetch(xmlUrl);
    const xmlText = await response.text();

    const jsonData = JSON.parse(JSON.stringify(await parseTextToJson(xmlText)));
    const products = jsonData.products.product;

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

// XML'i JSON’a çevirme (manuel parse)
async function parseTextToJson(text) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  const items = xmlDoc.getElementsByTagName("product");
  const products = [];

  for (let i = 0; i < items.length; i++) {
    const p = items[i];
    products.push({
      sku: p.getElementsByTagName("sku")[0]?.textContent,
      name: p.getElementsByTagName("name")[0]?.textContent,
      url: p.getElementsByTagName("url")[0]?.textContent,
      imgUrl: p.getElementsByTagName("imgUrl")[0]?.textContent,
      price: p.getElementsByTagName("price")[0]?.textContent,
      brand: p.getElementsByTagName("productBrand")[0]?.textContent,
      category: p.getElementsByTagName("productCategory")[0]?.textContent,
    });
  }

  return { products: { product: products } };
}
