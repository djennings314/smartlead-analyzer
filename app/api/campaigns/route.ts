import { NextResponse } from 'next/server';
import { getCampaigns } from '@/lib/smartlead';

export async function GET() {
  try {
    const data = await getCampaigns();
    const campaigns = Array.isArray(data) ? data : (data?.data ?? []);
    return NextResponse.json(campaigns);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
