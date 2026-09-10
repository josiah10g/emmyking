// Vercel serverless function: /api/signed-url
// Accepts: POST application/json { bucket, path }
// Returns: { url: string } or { error: string }

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());

    const { bucket, path } = body;
    if (!bucket || !path) {
      return res.status(400).json({ error: 'Missing bucket or path' });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60); // 1 hour

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ url: data.signedUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
