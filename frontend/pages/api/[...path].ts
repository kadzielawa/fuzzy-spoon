import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Log once at module load so it's visible in server startup output
console.log(`\n[API Proxy] ✅ BACKEND_URL = ${BACKEND_URL}\n`);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path;

  console.log(`[API Proxy] ========== INCOMING REQUEST ==========`);
  console.log(`[API Proxy] Path query param:`, path);
  console.log(`[API Proxy] Resolved pathString:`, pathString);

  if (!pathString) {
    console.error('[API Proxy] ERROR: No path provided');
    return res.status(400).json({ error: 'No path provided' });
  }

  const url = `${BACKEND_URL}/api/${pathString}`;
  const userId = req.headers['x-user-id'] || 'user-123';

  console.log(`[API Proxy] Method: ${req.method}`);
  console.log(`[API Proxy] BACKEND_URL env: ${BACKEND_URL}`);
  console.log(`[API Proxy] Full target URL: ${url}`);
  console.log(`[API Proxy] User ID header: ${userId}`);
  console.log(`[API Proxy] Request headers:`, req.headers);

  try {
    console.log(`[API Proxy] Sending ${req.method} request to: ${url}`);
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(userId),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    console.log(`[API Proxy] Response received: status=${response.status} ${response.statusText}`);
    console.log(`[API Proxy] Response headers:`, Object.fromEntries(response.headers.entries()));

    // Check if response is JSON or something else
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
      console.log(`[API Proxy] Response body (first 200 chars):`, JSON.stringify(data).substring(0, 200));
    } else {
      const text = await response.text();
      console.error('[API Proxy] Non-JSON response:', {
        status: response.status,
        contentType,
        preview: text.substring(0, 200),
      });
      return res.status(502).json({
        error: 'Backend server error',
        details: `Expected JSON but received ${contentType || 'unknown content type'}`,
        hint: 'Make sure the backend is running on port 3001',
      });
    }

    console.log(`[API Proxy] SUCCESS: Returning status ${response.status} to client`);
    res.status(response.status).json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Proxy Error] ========== ERROR OCCURRED ==========');
    console.error('[API Proxy Error] URL:', url);
    console.error('[API Proxy Error] Message:', errorMessage);
    console.error('[API Proxy Error] Error object:', error);

    // Check if it's a connection error
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
      console.error('[API Proxy Error] Connection refused - backend not running');
      return res.status(503).json({
        error: 'Backend service unavailable',
        details: errorMessage,
        hint: `Cannot connect to backend at ${BACKEND_URL}. Start the backend with: cd backend && npm run dev`,
      });
    }

    res.status(500).json({
      error: 'Proxy error',
      details: errorMessage,
    });
  }
}
