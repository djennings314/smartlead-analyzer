import { NextResponse } from 'next/server';

const BASE = 'https://server.smartlead.ai/api/v1';

export async function GET() {
  const key = process.env.SMARTLEAD_API_KEY;
  try {
    const res = await fetch(`${BASE}/campaigns?api_key=${key}&limit=100&offset=0`);
    const text = await res.text();
    return NextResponse.json({ status: res.status, body: text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}