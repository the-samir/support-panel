export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Tracking ID yoxdur' });

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token tapılmadı' });

  try {
    const searchRes = await fetch('https://api.notion.com/v1/databases/1df0b457c8b48086b007e96a116faf27/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Tracking ID',
          rich_text: { equals: id }
        }
      })
    });

    const data = await searchRes.json();

    if (!searchRes.ok) {
      return res.status(500).json({ error: data.message || 'Notion xətası' });
    }

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: 'Sorğu tapılmadı' });
    }

    const page = data.results[0];
    const props = page.properties;

    const taskName = props['Task name']?.title?.[0]?.text?.content || 'Adsız';
    const status = props['Status']?.status?.name || 'Bilinmir';
    const priority = props['Priority']?.select?.name || null;
    const dueDate = props['Due date']?.date?.start || null;
    const createdTime = page.created_time;

    return res.status(200).json({
      success: true,
      taskName,
      status,
      priority,
      dueDate,
      createdTime
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
