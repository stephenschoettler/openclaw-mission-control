import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function POST(req: Request) {
  try {
    const { service } = await req.json();
    if (!service) return NextResponse.json({ error: 'Missing service' }, { status: 400 });

    let cmd = '';
    if (service === 'gateway') {
      cmd = 'systemctl --user restart openclaw-gateway';
    } else if (service === 'mission-control') {
      cmd = 'systemctl --user restart mission-control';
    } else if (service.startsWith('docker:')) {
      const container = service.replace('docker:', '');
      if (!/^[a-zA-Z0-9_-]+$/.test(container)) {
        return NextResponse.json({ error: 'Invalid container name' }, { status: 400 });
      }
      cmd = `docker restart ${container}`;
    } else {
      return NextResponse.json({ error: 'Unknown service' }, { status: 400 });
    }

    execSync(cmd, { timeout: 5000 });
    return NextResponse.json({ ok: true, service });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
