export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { taskName, description, priority, dueDate, isDatetime, tags } = req.body;

  if (!taskName || !taskName.trim()) {
    return res.status(400).json({ error: 'Task adı boş ola bilməz' });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Notion token tapılmadı' });
  }

  // DEBUG - sonra siləcəyik
  if (req.body.debug) {
    return res.status(200).json({ token_prefix: token.substring(0, 10), token_length: token.length });
  }

  const properties = {
    "Task name": {
      title: [{ text: { content: taskName.trim() } }]
    },
    "Status": {
      status: { name: "Not started" }
    },
    "Project": {
      relation: [{ id: "2150b457-c8b4-8066-b07c-f4fabd8098b4" }]
    }
  };

  if (priority) {
    properties["Priority"] = { select: { name: priority } };
  }

  if (description && description.trim()) {
    properties["Description"] = {
      rich_text: [{ text: { content: description.trim() } }]
    };
  }

  if (dueDate) {
    properties["Due date"] = {
      date: { start: dueDate, time_zone: isDatetime ? "Asia/Baku" : null }
    };
  }

  if (tags && tags.length > 0) {
    properties["Tags"] = {
      multi_select: tags.map(tag => ({ name: tag.trim() })).filter(t => t.name)
    };
  }

  try {
    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: '1df0b457c8b48086b007e96a116faf27' },
        properties
      })
    });

    const data = await notionRes.json();

    if (!notionRes.ok) {
      return res.status(500).json({ error: data.message || 'Notion xətası' });
    }

    return res.status(200).json({ success: true, url: data.url, id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
