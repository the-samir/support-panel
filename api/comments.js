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
        filter: { property: 'Tracking ID', rich_text: { equals: id } }
      })
    });

    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return res.status(404).json({ error: 'Sorğu tapılmadı' });
    }

    const pageId = searchData.results[0].id;

    const commentsRes = await fetch(`https://api.notion.com/v1/comments?block_id=${pageId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28'
      }
    });

    const commentsData = await commentsRes.json();

    if (!commentsRes.ok) {
      return res.status(500).json({ error: commentsData.message || 'Commentlər yüklənmədi' });
    }

    const comments = (commentsData.results || []).map(c => {
      const text = c.rich_text?.map(r => r.text?.content || '').join('') || '';
      const isUser = text.startsWith('[İstifadəçi]: ');
      return {
        id: c.id,
        text: isUser ? text.replace('[İstifadəçi]: ', '') : text,
        isUser,
        time: c.created_time
      };
    });

    return res.status(200).json({ success: true, comments });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
