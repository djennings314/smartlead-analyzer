'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

interface Campaign { id: number; name: string; status: string; }
interface SequenceStep { step: number; leads_reached: number; replies_at_step: number; reply_rate_pct: number; }
interface SubjectPerf { subject: string; times_used: number; reply_rate_pct: number; }
interface Bottleneck { type: string; severity: 'high' | 'medium' | 'low'; description: string; recommendation: string; }
interface Stats {
  total_leads: number;
  leads_with_replies: number;
  reply_rate_pct: number;
  avg_touches_before_reply: number;
  dead_threads: number;
  no_reply_threads: number;
  sequence_dropoff: SequenceStep[];
  subject_performance: SubjectPerf[];
}
interface Analysis { top_finding: string; bottlenecks: Bottleneck[]; }
interface Result { stats: Stats; analysis: Analysis; leads_sampled: number; leads_total: number; }

type Stage = 'idle' | 'fetching_leads' | 'fetching_histories' | 'analyzing' | 'done' | 'error';

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [sample, setSample] = useState(200);
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load campaigns'));
  }, []);

  async function runAnalysis() {
    if (!selectedId) return;
    setStage('fetching_leads');
    setResult(null);
    setError('');

    try {
      setStage('fetching_histories');
      const res = await fetch(`/api/analyze/${selectedId}?sample=${sample}`);
      setStage('analyzing');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setStage('done');
    } catch (e: any) {
      setError(e.message);
      setStage('error');
    }
  }

  const stageLabel: Record<Stage, string> = {
    idle: '',
    fetching_leads: 'Fetching all leads…',
    fetching_histories: 'Pulling message histories (this may take a moment for large campaigns)…',
    analyzing: 'Running AI analysis…',
    done: '',
    error: '',
  };

  const campaign = campaigns.find(c => String(c.id) === selectedId);
  const s = result?.stats;
  const a = result?.analysis;

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerIcon}>⚡</div>
        <div>
          <div className={styles.headerTitle}>Bottleneck Analyzer</div>
          <div className={styles.headerSub}>Smartlead · Campaign Message History</div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.field}>
            <label>Campaign</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} disabled={stage !== 'idle' && stage !== 'done' && stage !== 'error'}>
              <option value="">— Select a campaign —</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field} style={{ width: 140 }}>
            <label>Sample (leads)</label>
            <input
              type="number"
              value={sample}
              min={10}
              max={2000}
              onChange={e => setSample(parseInt(e.target.value) || 200)}
              disabled={stage !== 'idle' && stage !== 'done' && stage !== 'error'}
            />
          </div>
          <button
            className={styles.btn}
            onClick={runAnalysis}
            disabled={!selectedId || (stage !== 'idle' && stage !== 'done' && stage !== 'error')}
          >
            {stage !== 'idle' && stage !== 'done' && stage !== 'error' ? '…' : '▶ Analyze'}
          </button>
          {result && (
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setResult(null); setStage('idle'); setError(''); }}>
              ↺ Reset
            </button>
          )}
        </div>

        {/* Progress */}
        {stage !== 'idle' && stage !== 'done' && stage !== 'error' && (
          <div className={styles.progressWrap}>
            <div className={styles.progressLabel}>{stageLabel[stage]}</div>
            <div className={styles.progressTrack}>
              <div className={`${styles.progressFill} ${styles.indeterminate}`} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className={styles.errorBox}>⚠ {error}</div>}

        {/* Results */}
        {result && s && a && (
          <>
            {/* Meta */}
            <div className={styles.metaBar}>
              <span className={styles.tag}>Campaign: {campaign?.name}</span>
              <span className={styles.tag}>Sampled: {result.leads_sampled.toLocaleString()} / {result.leads_total.toLocaleString()} leads</span>
            </div>

            {/* Top Finding */}
            <div className={styles.topFinding}>
              <span className={styles.findingIcon}>⚠</span>
              <div>
                <div className={styles.findingLabel}>Key Finding</div>
                <div className={styles.findingText}>{a.top_finding}</div>
              </div>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
              {[
                { label: 'Leads Sampled', value: s.total_leads.toLocaleString(), cls: '' },
                { label: 'With Replies', value: s.leads_with_replies.toLocaleString(), cls: 'green' },
                { label: 'Reply Rate', value: `${s.reply_rate_pct}%`, cls: s.reply_rate_pct >= 10 ? 'green' : 'red' },
                { label: 'Avg Touches', value: s.avg_touches_before_reply.toFixed(1), cls: '' },
                { label: 'Dead Threads', value: s.dead_threads.toLocaleString(), cls: 'red' },
                { label: 'No Reply', value: s.no_reply_threads.toLocaleString(), cls: 'red' },
              ].map(card => (
                <div key={card.label} className={styles.statCard}>
                  <div className={styles.statLabel}>{card.label}</div>
                  <div className={`${styles.statValue} ${styles[card.cls] || ''}`}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Two col */}
            <div className={styles.twoCol}>
              {/* Sequence Drop-off */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span>Sequence Drop-off</span>
                  <span className={styles.tag}>by step</span>
                </div>
                <div className={styles.panelBody}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Step</th>
                        <th>Reached</th>
                        <th>Replied</th>
                        <th>Rate</th>
                        <th style={{ width: 100 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.sequence_dropoff.map(row => {
                        const pct = row.reply_rate_pct;
                        const color = pct >= 15 ? 'var(--green)' : pct >= 7 ? 'var(--amber)' : 'var(--red)';
                        const barColor = pct >= 15 ? 'var(--green)' : pct >= 7 ? 'var(--orange)' : 'var(--red)';
                        return (
                          <tr key={row.step}>
                            <td><span className={styles.tag}>Step {row.step}</span></td>
                            <td>{row.leads_reached.toLocaleString()}</td>
                            <td>{row.replies_at_step.toLocaleString()}</td>
                            <td style={{ color }}>{pct}%</td>
                            <td>
                              <div className={styles.barTrack}>
                                <div className={styles.barFill} style={{ width: `${Math.min(pct * 4, 100)}%`, background: barColor }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottlenecks */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span>Bottlenecks</span>
                  <span className={styles.tag}>{a.bottlenecks.length} found</span>
                </div>
                <div className={styles.panelBody}>
                  <div className={styles.bnList}>
                    {a.bottlenecks.map((bn, i) => (
                      <div key={i} className={styles.bnItem}>
                        <span className={`${styles.sevBadge} ${styles[`sev_${bn.severity}`]}`}>{bn.severity}</span>
                        <div>
                          <div className={styles.bnType}>{bn.type}</div>
                          <div className={styles.bnDesc}>{bn.description}</div>
                          <div className={styles.bnRec}>→ {bn.recommendation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Subject Performance */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span>Subject Line Performance</span>
                <span className={styles.tag}>reply rate</span>
              </div>
              <div className={styles.panelBody}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Used</th>
                      <th style={{ textAlign: 'right' }}>Reply Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.subject_performance.map((row, i) => {
                      const pct = row.reply_rate_pct;
                      const color = pct >= 15 ? 'var(--green)' : pct >= 7 ? 'var(--amber)' : 'var(--red)';
                      return (
                        <tr key={i}>
                          <td className={styles.subjCell} title={row.subject}>{row.subject}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{row.times_used}×</td>
                          <td style={{ color, textAlign: 'right', fontFamily: 'var(--mono)' }}>{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {stage === 'idle' && !result && !error && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <div>Select a campaign and click Analyze</div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>All data fetched server-side — works on campaigns of any size</div>
          </div>
        )}
      </main>
    </div>
  );
}
