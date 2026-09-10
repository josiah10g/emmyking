// Vercel serverless function: /api/receipt-upload
// Accepts: POST multipart/form-data with fields: file, reference
// Returns: { path: string } or { error: string }

import { createClient } from '@supabase/supabase-js';

const BUCKET = 'payment-receipts';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Expected multipart/form-data' });
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);

    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch) return res.status(400).json({ error: 'No boundary found' });

    const parts = parseMultipart(rawBody, boundaryMatch[1]);
    const filePart = parts.find((p) => p.name === 'file');
    const referencePart = parts.find((p) => p.name === 'reference');

    if (!filePart) return res.status(400).json({ error: 'No file field found' });

    const reference = referencePart ? referencePart.data.toString().trim() : `EK-${Date.now()}`;
    const ext = (filePart.filename || 'receipt').split('.').pop() || 'jpg';
    const filePath = `${reference.toUpperCase()}/${Date.now()}.${ext}`;
    const mimeType = filePart.contentType || 'image/jpeg';

    // Ensure bucket exists
    const { error: bucketErr } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
    }).catch(() => ({ error: null }));

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, filePart.data, { contentType: mimeType, upsert: true });

    if (error) {
      console.error('[api/receipt-upload] storage error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ path: filePath });
  } catch (err) {
    console.error('[api/receipt-upload] error:', err);
    return res.status(500).json({ error: err.message });
  }
}

function parseMultipart(body, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;

  while (true) {
    const delimIdx = body.indexOf(delimiter, start);
    if (delimIdx === -1) break;
    const afterDelim = delimIdx + delimiter.length;
    if (body.slice(afterDelim, afterDelim + 2).toString() === '--') break;

    const headerStart = afterDelim + 2;
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const headerSection = body.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4;
    const nextDelim = body.indexOf(delimiter, dataStart);
    const dataEnd = nextDelim === -1 ? body.length : nextDelim - 2;
    const data = body.slice(dataStart, dataEnd);

    const nameMatch = headerSection.match(/name="([^"]+)"/);
    const filenameMatch = headerSection.match(/filename="([^"]+)"/);
    const ctMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);

    parts.push({
      name: nameMatch ? nameMatch[1] : '',
      filename: filenameMatch ? filenameMatch[1] : undefined,
      contentType: ctMatch ? ctMatch[1].trim() : undefined,
      data,
    });

    start = nextDelim === -1 ? body.length : nextDelim;
  }

  return parts;
}
