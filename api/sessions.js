const NOTION_VERSION = process.env.NOTION_VERSION || "2022-06-28";

function getTitle(prop) {
  return prop?.title?.[0]?.plain_text || "";
}

function getSelect(prop) {
  return prop?.select?.name || "";
}

function getDateStart(prop) {
  return prop?.date?.start || null;
}

function getNumber(prop) {
  return typeof prop?.number === "number" ? prop.number : 0;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const notionResponse = await fetch(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_VERSION
        },
        body: JSON.stringify({
          page_size: 100,
          sorts: [
            {
              property: "Start",
              direction: "descending"
            }
          ]
        })
      }
    );

    const notionJson = await notionResponse.json();

    if (!notionResponse.ok) {
      return res.status(notionResponse.status).json({
        error: "Notion query failed",
        details: notionJson
      });
    }

    const sessions = (notionJson.results || []).map((page) => {
      const props = page.properties || {};

      return {
        id: page.id,
        session: getTitle(props.Session),
        profile: getSelect(props.Profile),
        start: getDateStart(props.Start),
        end: getDateStart(props.End),
        durationMinutes: getNumber(props["Duration Minutes"]),
        durationMs: getNumber(props["Duration Minutes"]) * 60000,
        date: getDateStart(props.Date)
      };
    });

    return res.status(200).json({ sessions });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}