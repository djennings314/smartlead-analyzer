import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads, getMessageHistory } from '@/lib/smartlead';

async function batchFetch<T>(
  items: T[],
  fn: (item: T) => Promise<any>,
  concurrency = 8
) {
  const results: any[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const { campaignId } = params;
  const url = new URL(req.url);
  const sampleStr = url.searchParams.get('sample');
  const sample = sampleStr ? parseInt(sampleStr) : 200;

  try {
    // 1. Get all leads (paginated server-side)
    const allLeads = await getAllLeads(campaignId);
    const leads = sample > 0 ? allLeads.slice(0, sample) : allLeads;

    // 2. Fetch all message histories with concurrency
    const histories = await batchFetch(
      leads,
      async (lead: any) => ({
        lead_id: lead.id,
        email: lead.email,
        history: await getMessageHistory(campaignId, lead.id),
      }),
      8
    );

    // 3. Compute stats server-side so Claude gets clean structured data
    const stats = computeStats(histories);

    // 4. Ask Claude to analyze
    const analysis = await runAnalysis(stats);

    return NextResponse.json({ stats, analysis, leads_sampled: leads.length, leads_total: allLeads.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function computeStats(histories: any[]) {
  const seqMap: Record<number, { reached: number; replied: number }> = {};
  const subjectMap: Record<string, { sent: number; replied: number }> = {};
  let leadsWithReply = 0;
  let deadThreads = 0; // replied then went cold
  let noReplyThreads = 0;
  let totalTouchesBeforeReply = 0;
  let repliers = 0;

  for (const { history } of histories) {
    if (!Array.isArray(history) || history.length === 0) {
      noReplyThreads++;
      continue;
    }

    const sent = history.filter((m: any) => m.type === 'SENT');
    const replies = history.filter((m: any) => m.type === 'REPLY');
    const hasReply = replies.length > 0;

    if (hasReply) {
      leadsWithReply++;
      // touches before first reply
      const firstReplyIdx = history.findIndex((m: any) => m.type === 'REPLY');
      const touchesBefore = history.slice(0, firstReplyIdx).filter((m: any) => m.type === 'SENT').length;
      totalTouchesBeforeReply += touchesBefore;
      repliers++;

      // dead thread: replied but no further sent after reply
      const lastReplyIdx = history.map((m: any) => m.type).lastIndexOf('REPLY');
      const sentAfterLastReply = history.slice(lastReplyIdx + 1).some((m: any) => m.type === 'SENT');
      if (!sentAfterLastReply && sent.length > 0) deadThreads++;
    } else {
      noReplyThreads++;
    }

    // Sequence drop-off
    for (const msg of sent) {
      const seq = msg.sequence_number ?? msg.seq_number ?? 1;
      if (!seqMap[seq]) seqMap[seq] = { reached: 0, replied: 0 };
      seqMap[seq].reached++;

      // Did they reply after this step?
      const msgIdx = history.indexOf(msg);
      const repliedAfter = history.slice(msgIdx + 1).some((m: any) => m.type === 'REPLY');
      if (repliedAfter) seqMap[seq].replied++;

      // Subject tracking
      const subj = (msg.email_subject || msg.subject || '(no subject)').substring(0, 80);
      if (!subjectMap[subj]) subjectMap[subj] = { sent: 0, replied: 0 };
      subjectMap[subj].sent++;
      if (repliedAfter) subjectMap[subj].replied++;
    }
  }

  const sequence_dropoff = Object.entries(seqMap)
    .map(([step, d]) => ({
      step: parseInt(step),
      leads_reached: d.reached,
      replies_at_step: d.replied,
      reply_rate_pct: d.reached > 0 ? Math.round((d.replied / d.reached) * 100) : 0,
    }))
    .sort((a, b) => a.step - b.step);

  const subject_performance = Object.entries(subjectMap)
    .map(([subject, d]) => ({
      subject,
      times_used: d.sent,
      reply_rate_pct: d.sent > 0 ? Math.round((d.replied / d.sent) * 100) : 0,
    }))
    .sort((a, b) => b.times_used - a.times_used)
    .slice(0, 20);

  return {
    total_leads: histories.length,
    leads_with_replies: leadsWithReply,
    reply_rate_pct: histories.length > 0 ? Math.round((leadsWithReply / histories.length) * 100) : 0,
    avg_touches_before_reply: repliers > 0 ? Math.round((totalTouchesBeforeReply / repliers) * 10) / 10 : 0,
    dead_threads: deadThreads,
    no_reply_threads: noReplyThreads,
    sequence_dropoff,
    subject_performance,
  };
}

async function runAnalysis(stats: any) {
  const prompt = `You are a B2B cold email expert analyzing campaign bottlenecks.

Here are the computed stats from a Smartlead campaign:
${JSON.stringify(stats, null, 2)}

Identify the key bottlenecks, patterns, and actionable recommendations.

Return ONLY valid JSON, no markdown fences:
{
  "top_finding": "one concise sentence summarizing the biggest issue",
  "bottlenecks": [
    {
      "type": "string (e.g. Drop-off at Step 2, Low reply rate, Dead threads)",
      "severity": "high|medium|low",
      "description": "what the data shows",
      "recommendation": "specific action to fix it"
    }
  ]
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  const raw = data.content?.find((b: any) => b.type === 'text')?.text ?? '{}';
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { top_finding: 'Analysis complete.', bottlenecks: [] };
  }
}
