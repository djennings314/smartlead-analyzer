import { NextResponse } from 'next/server';
import { getAllLeads } from '@/lib/smartlead';

export async function GET(
  _req: Request,
  { params }: { params: { campaignId: string } }
) {
  try {
    const leads = await getAllLeads(params.campaignId);
    return NextResponse.json({ count: leads.length, leads: leads.map((l: any) => ({ id: l.id, email: l.email })) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
