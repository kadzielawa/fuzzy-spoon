import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path;

  if (!pathString) {
    return res.status(400).json({ error: 'No path provided' });
  }

  const url = `${BACKEND_URL}/api/${pathString}`;
  const userId = req.headers['x-user-id'] || 'user-123';

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(userId),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Check if response is JSON or something else
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
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

    res.status(response.status).json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Proxy Error]', { url, error: errorMessage });

    // Check if it's a connection error
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
      return res.status(503).json({
        error: 'Backend service unavailable',
        details: errorMessage,
        hint: `Cannot connect to backend at ${BACKEND_URL}. Start the backend with: cd backend && npm run dev`,
      });
    }

    res.status(500).json({
      error: 'API proxy error',
      details: errorMessage,
    });
  }
}
