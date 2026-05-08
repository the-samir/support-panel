import { checkAdmin } from './_adminAuth.js';

const VALID_STATUSES = ['Not started', 'In progress', 'In Review', 'Done', 'On Hold', 'Cancelled'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const userId = await checkAdmin(req, res);
  if (!userId) return;

  const { pageId, status } = req.body || {};
  if (!pageId || !status) return res.status(400).json({ error: 'pageId və status lazımdır' });
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Etibarsız status' });

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token tapılmadı' });

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        properties: { 'Status': { status: { name: status } } }
      })
    });

    if (!notionRes.ok) {
      const err = await notionRes.json();
      return res.status(500).json({ error: err.message || 'Notion xətası' });
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
