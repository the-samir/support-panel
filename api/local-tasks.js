export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { trackingIds } = req.body || {};
  if (!trackingIds || !trackingIds.length) {
    return res.status(200).json({ success: true, tasks: [] });
  }

  const ids = trackingIds.slice(0, 50);
  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token tapılmadı' });

  const dbId = process.env.NOTION_DATABASE_ID;
  if (!dbId) return res.status(500).json({ error: 'Database ID tapılmadı' });

  const filter = ids.length === 1
    ? { property: 'Tracking ID', rich_text: { equals: ids[0] } }
    : { or: ids.map(id => ({ property: 'Tracking ID', rich_text: { equals: id } })) };

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }]
      })
    });

    const data = await notionRes.json();
    if (!notionRes.ok) return res.status(500).json({ error: data.message || 'Notion xətası' });

    const tasks = (data.results || []).map(page => {
      const props = page.properties;
      return {
        taskName: props['Task name']?.title?.[0]?.text?.content || 'Adsız',
        status: props['Status']?.status?.name || 'Bilinmir',
        priority: props['Priority']?.select?.name || null,
        dueDate: props['Due date']?.date?.start || null,
        trackingId: props['Tracking ID']?.rich_text?.[0]?.text?.content || null,
        tags: props['Tags']?.multi_select?.map(t => t.name) || [],
        createdTime: page.created_time
      };
    });

    return res.status(200).json({ success: true, tasks });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
