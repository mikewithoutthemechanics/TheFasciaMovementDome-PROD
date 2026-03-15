import { Request, Response } from 'express';

export async function healthCheck(_req: Request, res: Response) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime?.() || 0,
    environment: process.env.NODE_ENV || 'development',
  };
  
  res.json(health);
}

export async function readinessCheck(_req: Request, res: Response) {
  res.json({ ready: true });
}
