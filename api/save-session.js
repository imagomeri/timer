const NOTION_VERSION = process.env.NOTION_VERSION || "2022-06-28";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { profile, start, end } = req.body || {};

    if (!profile || !start || !end) {
      return res.status(400).json({ error: "Missing profile, start, or end" });
    }

    if (!["larua", "margo"].includes(profile)) {
      return res.status(400).json({ error: "Invalid profile" });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ error: "End time must be after start time" });
    }

    const durationMinutes = Math.round((endDate - startDate) / 60000);
    const sessionDate = startDate.toISOString().split("T")[0];

    const notionResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION
      },
      body: JSON.stringify({
        parent: {
          database_id: process.env.NOTION_DATABASE_ID
        },
        properties: {
          Session: {
            title: [
              {
                text: {
                  content: `${profile} — ${sessionDate}`
                }
              }
            ]
          },
          Profile: {
            select: {
              name: profile
            }
          },
          Start: {
            date: {
              start: startDate.toISOString()
            }
          },
          End: {
            date: {
              start: endDate.toISOString()
            }
          },
          "Duration Minutes": {
            number: durationMinutes
          },
          Date: {
            date: {
              start: sessionDate
            }
          }
        }
      })
    });

    const notionJson = await notionResponse.json();

    if (!notionResponse.ok) {
      return res.status(notionResponse.status).json({
        error: "Notion create failed",
        details: notionJson
      });
    }

    return res.status(200).json({
      ok: true,
      pageId: notionJson.id
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}