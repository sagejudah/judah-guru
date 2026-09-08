import { NextResponse } from 'next/server';
import { getRedis, ROOM_TTL_SECONDS } from '@/lib/redis';

// Avoids visually ambiguous characters (0/O, 1/I/L) so a code is easy to
// read aloud or type on a phone keyboard.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(len = 4) {
  let code = '';
  for (let i = 0; i < len; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

const MAX_BODY_BYTES = 20000;

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  }
  let body = '{}';
  try {
    JSON.parse(text || '{}');
    body = text || '{}';
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const redis = await getRedis();
  let code = '';
  for (let attempt = 0; attempt < 8; attempt++) {
    code = generateCode();
    const exists = await redis.exists(`quiz:room:${code}`);
    if (!exists) break;
  }

  await redis.set(`quiz:room:${code}`, body, { EX: ROOM_TTL_SECONDS });
  return NextResponse.json({ code });
}
