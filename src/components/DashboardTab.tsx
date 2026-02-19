import { useState, useEffect } from 'react';
import { db } from '../services/db';

const CAT_ICONS: Record<string, string> = {
  Food: '🍔', Transport: '🚗', Entertainment: '🎬', Health: '💊',
  Shopping: '🛍️', Utilities: '💡', Education: '📚', Other: '📦',
};

const CAT_COLORS: Record<string, string> = {
  Food: '#f97316', Transport: '#3b82f6', Entertainment: '#a855f7',
  Health: '#10b981', Shopping: '#ec4899', Utilities: '#f59e0b',
  Education: '#06b6d4', Other: '#6b7280',
};

export default function DashboardTab() {
  const [summary, setSummary]       = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [recent, setRecent]         = useState<any[]>([]);

  useEffect(() => {
    Promise.all([db.getSummary(), db.getCategories(), db.getAll()]).then(([s, c, all]) => {
      setSummary(s);
      setCategories(c);
      setRecent(all.slice(0, 5));
    });
  }, []);

  if (!summary) return (
    <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
      Loading dashboard...
    </div>
  );

  const maxCatAmount = categories.length > 0 ? categories[0].amount : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>

        <div style={{ padding: '18px', background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 600 }}>Total Spent</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981' }}>${summary.total}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>last 30 days</div>
        </div>

        <div style={{ padding: '18px', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 600 }}>Transactions</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#3b82f6' }}>{summary.count}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>this period</div>
        </div>

        <div style={{ padding: '18px', background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 600 }}>Daily Avg</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b' }}>${(summary.total / 30).toFixed(2)}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>per day</div>
        </div>

      </div>

      {/* ── Category Breakdown ── */}
      <div className="card">
        <h3 style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Spending by Category
        </h3>

        {categories.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No expenses yet. Start logging to see your breakdown.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categories.map((c: any) => {
              const color    = CAT_COLORS[c.category] ?? '#6b7280';
              const icon     = CAT_ICONS[c.category]  ?? '📦';
              const pct      = ((c.amount / maxCatAmount) * 100).toFixed(0);
              const totalPct = summary.total > 0 ? ((c.amount / summary.total) * 100).toFixed(1) : '0';
              return (
                <div key={c.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{c.category}</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{c.count} transaction{c.count > 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color, fontSize: '15px' }}>${c.amount}</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '6px' }}>{totalPct}%</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Transactions ── */}
      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Recent Transactions
        </h3>

        {recent.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No transactions yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recent.map((t: any) => {
              const color = CAT_COLORS[t.category] ?? '#6b7280';
              const icon  = CAT_ICONS[t.category]  ?? '📦';
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.item}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{t.category} • {t.date}</div>
                  </div>
                  <div style={{ fontWeight: 700, color, fontSize: '14px', flexShrink: 0 }}>${t.amount}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}