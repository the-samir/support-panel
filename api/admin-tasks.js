import { checkAdmin } from './_adminAuth.js';

const DB = '1df0b457c8b48086b007e96a116faf27';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const userId = await checkAdmin(req, res);
  if (!userId) return;

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token tapılmadı' });

  const { status, priority } = req.query;
  const filters = [
    { property: 'Project', relation: { contains: '35a0b457-c8b4-80cb-a23a-f0818b68b089' } }
  ];
  if (status) filters.push({ property: 'Status', status: { equals: status } });
  if (priority) filters.push({ property: 'Priority', select: { equals: priority } });

  const body = {
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    page_size: 100,
    filter: { and: filters }
  };

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${DB}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(body)
    });

    const data = await notionRes.json();
    if (!notionRes.ok) return res.status(500).json({ error: data.message || 'Notion xətası' });

    const tasks = (data.results || []).map(page => {
      const props = page.properties;
      return {
        pageId: page.id,
        taskName: props['Task name']?.title?.[0]?.text?.content || 'Adsız',
        status: props['Status']?.status?.name || 'Not started',
        priority: props['Priority']?.select?.name || null,
        dueDate: props['Due date']?.date?.start || null,
        trackingId: props['Tracking ID']?.rich_text?.[0]?.text?.content || null,
        requester: props['Requester']?.rich_text?.[0]?.text?.content || null,
        tags: props['Tags']?.multi_select?.map(t => t.name) || [],
        createdTime: page.created_time
      };
    });

    return res.json({ success: true, tasks });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
