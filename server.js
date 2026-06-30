const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

function decodeXml(text) {
  return String(text || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'");
}

function extractTemplate(xml) {
  const decoded = decodeXml(xml);

  const checks = [
    {
      type: "Classic Shirt",
      patterns: [
        /<Content name="ShirtTemplate">[\s\S]*?id=(\d+)[\s\S]*?<\/Content>/i,
        /ShirtTemplate[\s\S]*?id=(\d+)/i
      ]
    },
    {
      type: "Classic Pants",
      patterns: [
        /<Content name="PantsTemplate">[\s\S]*?id=(\d+)[\s\S]*?<\/Content>/i,
        /PantsTemplate[\s\S]*?id=(\d+)/i
      ]
    },
    {
      type: "Classic T-Shirt",
      patterns: [
        /<Content name="Graphic">[\s\S]*?id=(\d+)[\s\S]*?<\/Content>/i,
        /Graphic[\s\S]*?id=(\d+)/i
      ]
    }
  ];

  for (const check of checks) {
    for (const pattern of check.patterns) {
      const match = decoded.match(pattern);
      if (match && match[1]) {
        return {
          type: check.type,
          templateId: match[1]
        };
      }
    }
  }

  return null;
}

app.get("/api/find", async (req, res) => {
  try {
    const id = String(req.query.id || "").match(/\d+/)?.[0];

    if (!id) {
      return res.status(400).json({
        error: "Missing or invalid Roblox clothing ID."
      });
    }

    const assetUrl = `https://assetdelivery.roblox.com/v1/asset?id=${id}`;

    const response = await fetch(assetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 RobloxTemplateFinder"
      }
    });

    if (!response.ok) {
      return res.status(404).json({
        error: "Could not load this Roblox asset. It may be private, deleted, moderated, or invalid."
      });
    }

    const xml = await response.text();
    const found = extractTemplate(xml);

    if (!found) {
      return res.status(404).json({
        error: "No classic clothing template found. This may be layered clothing, UGC 3D clothing, or not a classic shirt/pants/t-shirt."
      });
    }

    res.json({
      type: found.type,
      templateId: found.templateId,
      previewUrl: `/api/image/${found.templateId}`,
      downloadUrl: `/api/download/${found.templateId}`
    });
  } catch (error) {
    res.status(500).json({
      error: "Server error while finding template."
    });
  }
});

app.get("/api/image/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").match(/\d+/)?.[0];

    if (!id) {
      return res.status(400).send("Invalid image ID.");
    }

    const imageUrl = `https://assetdelivery.roblox.com/v1/asset?id=${id}`;

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 RobloxTemplateFinder"
      }
    });

    if (!response.ok) {
      return res.status(404).send("Image not found.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (error) {
    res.status(500).send("Image error.");
  }
});

app.get("/api/download/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").match(/\d+/)?.[0];

    if (!id) {
      return res.status(400).send("Invalid image ID.");
    }

    const imageUrl = `https://assetdelivery.roblox.com/v1/asset?id=${id}`;

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 RobloxTemplateFinder"
      }
    });

    if (!response.ok) {
      return res.status(404).send("Image not found.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="roblox-template-${id}.png"`
    );

    res.send(buffer);
  } catch (error) {
    res.status(500).send("Download error.");
  }
});

app.listen(PORT, () => {
  console.log(`Roblox Template Finder is running on port ${PORT}`);
});
