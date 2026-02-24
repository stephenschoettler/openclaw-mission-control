import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const OPENCLAW_CONFIG = path.join(process.env.HOME || '/home/w0lf', '.openclaw', 'openclaw.json');

export async function GET() {
  try {
    if (!fs.existsSync(OPENCLAW_CONFIG)) {
      return NextResponse.json([]);
    }
    const data = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf-8'));
    const crons = data.crons || [];
    return NextResponse.json(crons);
  } catch {
    return NextResponse.json([]);
  }
}
