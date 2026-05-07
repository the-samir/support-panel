import { getAuthUserId } from './_clerk.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: 'Giriş tələb olunur' });

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token tapılmadı' });

  try {
    const notionRes = await fetch('https://api.notion.com/v1/databases/1df0b457c8b48086b007e96a116faf27/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'User ID',
          rich_text: { equals: userId }
        },
        sorts: [{ timestamp: 'created_time', direction: 'descending' }]
      })
    });

    const data = await notionRes.json();

    if (!notionRes.ok) {
      return res.status(500).json({ error: data.message || 'Notion xətası' });
    }

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
