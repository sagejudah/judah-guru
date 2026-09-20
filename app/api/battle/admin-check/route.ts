import { NextResponse } from 'next/server';

// Validates a submitted password against QUIZ_ADMIN_PASSWORDS (comma-
// separated, set in Vercel as a "sensitive" env var — not readable back
// through the dashboard or API once saved, only comparable server-side).
// This route never reveals which password matched or how many exist.
export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const list = (process.env.QUIZ_ADMIN_PASSWORDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = typeof body.password === 'string' && body.password.length > 0 && list.includes(body.password);
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
