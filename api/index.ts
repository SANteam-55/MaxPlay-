import app from '../server.ts';

export default function handler(req: any, res: any) {
  // Normalize URL path if Vercel stripped /api prefix during rewrites
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/proxy') && !req.url.startsWith('/native-banner')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}

