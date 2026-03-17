const BASE = 'https://server.smartlead.ai/api/v1';
const KEY = process.env.SMARTLEAD_API_KEY!;

export async function slFetch(path: string) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${path}${sep}api_key=${KEY}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Smartlead ${path} → ${res.status}`);
  return res.json();
}

export async function getCampaigns() {
  return slFetch('/campaigns?limit=100&offset=0');
}

export async function getAllLeads(campaignId: string) {
  const leads: any[] = [];
  let offset = 0;
  while (true) {
    const data = await slFetch(`/campaigns/${campaignId}/leads?limit=100&offset=${offset}`);
    const rows: any[] = data?.data ?? data ?? [];
    if (!Array.isArray(rows) || rows.length === 0) break;
    leads.push(...rows);
    if (rows.length < 100) break;
    offset += 100;
  }
  return leads;
}

export async function getMessageHistory(campaignId: string, leadId: string | number) {
  try {
    const data = await slFetch(`/campaigns/${campaignId}/leads/${leadId}/message-history`);
    return Array.isArray(data) ? data : (data?.history ?? []);
  } catch {
    return [];
  }
}
