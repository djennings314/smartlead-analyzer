import { NextResponse } from 'next/server';
import { slFetch } from '@/lib/smartlead';

export async function GET() {
  try {
    const data = await slFetch('/campaigns?limit=100&offset=0');
    
    // Handle all the shapes Smartlead might return
    let campaigns;
    if (Array.isArray(data)) {
      campaigns = data;
    } else if (data?.data && Array.isArray(data.data)) {
      campaigns = data.data;
    } else if (data?.campaigns && Array.isArray(data.campaigns)) {
      campaigns = data.campaigns;
    } else {
      campaigns = [];
    }

    return NextResponse.json(campaigns);
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}