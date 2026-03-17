import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.SMARTLEAD_API_KEY;
  return NextResponse.json({
    key_exists: !!key,
    key_length: key?.length ?? 0,
    key_preview: key ? key.substring(0, 8) + '...' : 'MISSING'
  });
}