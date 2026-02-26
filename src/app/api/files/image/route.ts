import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = os.homedir();

const ALLOWED_DIRS = [
  HOME,
  path.join(HOME, '.openclaw/workspace'),
  path.join(HOME, 'mission-control'),
];

function isAllowed(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  return ALLOWED_DIRS.some(dir => resolved === dir || resolved.startsWith(dir + path.sep));
}

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');
  if (!filePath) {
    return new NextResponse('Missing path', { status: 400 });
  }

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) {
    return new NextResponse('Not an image', { status: 400 });
  }

  if (!isAllowed(filePath)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
