export function validateEnv(res) {
  const missing = [];
  if (!process.env.NOTION_TOKEN) missing.push('NOTION_TOKEN');
  if (!process.env.CLERK_SECRET_KEY) missing.push('CLERK_SECRET_KEY');
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) missing.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  if (missing.length) {
    console.error('[env] Missing variables:', missing.join(', '));
    res.status(500).json({ error: 'Server konfiqurasiya xətası' });
    return false;
  }
  return true;
}
