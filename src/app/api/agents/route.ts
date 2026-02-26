import os from 'os';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const OPENCLAW_CONFIG = path.join(process.env.HOME || os.homedir(), '.openclaw', 'openclaw.json');

export async function GET() {
  try {
    if (!fs.existsSync(OPENCLAW_CONFIG)) {
      return NextResponse.json([]);
    }
    const data = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf-8'));
    const agents = data.agents?.list || [];
    return NextResponse.json(agents);
  } catch {
    return NextResponse.json([]);
  }
}
