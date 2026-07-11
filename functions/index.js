const { onRequest } = require('firebase-functions/v2/https');
const functions = require('firebase-functions');

const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/chat/completions';

exports.chat = onRequest({ cors: true, maxInstances: 5, timeoutSeconds: 120 }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  try {
    const nvidiaRes = await fetch(NVIDIA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(req.body),
    });

    const contentType = nvidiaRes.headers.get('Content-Type') || '';
    if (nvidiaRes.ok && contentType.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.status(200);

      const reader = nvidiaRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.trim()) res.write(line + '\n');
          }
        }
        if (buffer.trim()) res.write(buffer + '\n');
      } finally {
        res.end();
        reader.releaseLock?.();
      }
    } else {
      const data = await nvidiaRes.text();
      res.status(nvidiaRes.status);
      if (contentType) res.setHeader('Content-Type', contentType);
      res.send(data);
    }
  } catch (err) {
    functions.logger.error('Proxy error:', err);
    res.status(502).json({ error: err.message || 'Upstream request failed' });
  }
});
