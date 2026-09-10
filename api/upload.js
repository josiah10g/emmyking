// Vercel serverless function: /api/upload
// Accepts: POST multipart/form-data with a single `file` field
// Returns: { path: string } or { error: string }

import { createClient } from '@supabase/supabase-js';

const BUCKET = 'product-images';

// Use service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart body using the Web Streams API built into Node 18+
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Expected multipart/form-data' });
    }

    // Collect raw body as Buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // Extract boundary
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'No boundary found' });
    }
    const boundary = boundaryMatch[1];

    // Parse multipart manually
    const parts = parseMultipart(rawBody, boundary);
    const filePart = parts.find((p) => p.name === 'file');

    if (!filePart) {
      return res.status(400).json({ error: 'No file field found' });
    }

    const ext = (filePart.filename || 'upload').split('.').pop() || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const mimeType = filePart.contentType || 'image/jpeg';

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, filePart.data, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error('[api/upload] Supabase storage error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ path });
  } catch (err) {
    console.error('[api/upload] Unhandled error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/** Minimal multipart/form-data parser */
function parseMultipart(body, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;

  while (true) {
    const delimIdx = body.indexOf(delimiter, start);
    if (delimIdx === -1) break;
    const afterDelim = delimIdx + delimiter.length;

    // Check for closing delimiter
    if (body.slice(afterDelim, afterDelim + 2).toString() === '--') break;

    // Skip CRLF after delimiter
    const headerStart = afterDelim + 2;
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const headerSection = body.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4;

    const nextDelim = body.indexOf(delimiter, dataStart);
    const dataEnd = nextDelim === -1 ? body.length : nextDelim - 2; // strip trailing CRLF
    const data = body.slice(dataStart, dataEnd);

    // Parse headers
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
