import express from "express";
import fetch from "node-fetch";
import xml2js from "xml2js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const XML_URL = "https://www.electrobeyazshop.com/outputxml/index.php?xml_service_id=11";

app.use(cors());
app.use(express.static(__dirname)); // 🔥 Statik dosyaları (widget.html gibi) gösterebilmek için

app.get("/api/products", async (req, res) => {
  try {
    const response = await fetch(XML_URL);
    const xmlText = await response.text();

    xml2js.parseString(xmlText, { explicitArray: false }, (err, result) => {
      if (err) {
        console.error("XML parse error:", err);
        return res.status(500).json({ error: "XML parse error" });
      }

      const items = result?.products?.product || [];
      const products = Array.isArray(items) ? items : [items];

      const formatted = products.map(prod => ({
        id: prod.sku || "",
        name: prod.name?.trim() || "",
        price: parseFloat(prod.price) || 0,
        currency: prod.kur || "TL",
        stock: parseInt(prod.quantity) || 0,
        brand: prod.productBrand || "",
        category: prod.productCategory || "",
        image: prod.imgUrl || "",
        url: prod.url || "",
        description: prod.name || ""
      }));

      res.json(formatted);
    });
  } catch (error) {
    console.error("Fetch or process error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
