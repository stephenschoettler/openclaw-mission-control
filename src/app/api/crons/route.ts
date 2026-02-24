import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CRONS_FILE = path.join(process.env.HOME || '/home/w0lf', '.openclaw', 'cron', 'jobs.json');

export async function GET() {
  try {
    if (!fs.existsSync(CRONS_FILE)) {
      return NextResponse.json([]);
    }
    const data = JSON.parse(fs.readFileSync(CRONS_FILE, 'utf-8'));
    const jobs = data.jobs || [];
    return NextResponse.json(jobs);
  } catch {
    return NextResponse.json([]);
  }
}
