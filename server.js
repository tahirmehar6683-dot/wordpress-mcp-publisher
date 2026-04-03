import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const WP_URL = process.env.WP_URL;
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;
const MCP_SHARED_TOKEN = process.env.MCP_SHARED_TOKEN;

app.get("/", (_req, res) => {
  res.send("WordPress MCP publisher is running.");
});

app.post("/create-post", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!MCP_SHARED_TOKEN || token !== MCP_SHARED_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      post_title,
      post_content,
      meta_title,
      meta_description,
      slug,
      status = "draft"
    } = req.body;

    if (!post_title || !post_content) {
      return res.status(400).json({
        error: "post_title and post_content are required"
      });
    }

    const basicAuth = Buffer.from(
      `${WP_USERNAME}:${WP_APP_PASSWORD}`
    ).toString("base64");

    const wpResponse = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: post_title,
        content: post_content,
        slug,
        status
      })
    });

    const wpData = await wpResponse.json();

    if (!wpResponse.ok) {
      return res.status(wpResponse.status).json({
        error: "WordPress API error",
        details: wpData
      });
    }

    return res.json({
      success: true,
      wordpress_post_id: wpData.id,
      wordpress_post_url: wpData.link,
      meta_title,
      meta_description
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
