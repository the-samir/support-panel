import { randomBytes } from 'crypto';
import { getAuthUserId } from './_clerk.js';
import { validateEnv } from './_validateEnv.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!validateEnv(res)) return;

  const userId = await getAuthUserId(req) || '';

  const { taskName, description, priority, dueDate, isDatetime, tags, requesterName, website } = req.body;

  // Honeypot
  if (website) return res.status(400).json({ error: 'Spam aşkarlandı' });

  if (!taskName || !taskName.trim()) {
    return res.status(400).json({ error: 'Task adı boş ola bilməz' });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Notion token tapılmadı' });
  }

  const dbId = process.env.NOTION_DATABASE_ID;
  if (!dbId) {
    return res.status(500).json({ error: 'Notion database ID tapılmadı' });
  }

  const trackingId = randomBytes(6).toString('hex');

  const properties = {
    "Task name": {
      title: [{ text: { content: taskName.trim() } }]
    },
    "Status": {
      status: { name: "Not started" }
    },
    "Source": {
      select: { name: "Support Panel" }
    },
    "Azsoftware Layihəsi": {
      relation: [{ id: "35a0b457-c8b4-80cb-a23a-f0818b68b089" }]
    },
    "Tracking ID": {
      rich_text: [{ text: { content: trackingId } }]
    },
    "User ID": {
      rich_text: [{ text: { content: userId } }]
    },
    "Requester": {
      rich_text: [{ text: { content: (requesterName || '').trim() } }]
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
        parent: { database_id: dbId },
        icon: { type: 'external', external: { url: '/icons/verified_gray.svg' } },
        properties
      })
    });

    const data = await notionRes.json();

    if (!notionRes.ok) {
      return res.status(500).json({ error: data.message || 'Notion xətası' });
    }

    return res.status(200).json({ success: true, url: data.url, id: data.id, trackingId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
