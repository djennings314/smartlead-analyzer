import { NextResponse } from 'next/server';

const BASE = 'https://server.smartlead.ai/api/v1';

export async function GET() {
  const key = process.env.SMARTLEAD_API_KEY;
  try {
    const res = await fetch(`${BASE}/campaigns?api_key=${key}`);
    const data = await res.json();
    const campaigns = Array.isArray(data) ? data : (data?.data ?? data?.campaigns ?? []);
    return NextResponse.json(campaigns);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}