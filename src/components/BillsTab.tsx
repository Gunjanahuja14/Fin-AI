import { useState, useEffect } from 'react';
import { db } from '../services/db';

interface ManualBill {
  id: string;
  name: string;
  amount: number;
  cycle: 'monthly' | 'yearly' | 'weekly';
  category: string;
  color: string;
}

const SAMPLE_BILLS: ManualBill[] = [
  { id: 's1', name: 'Netflix',   amount: 15,  cycle: 'monthly', category: 'Entertainment', color: '#e50914' },
  { id: 's2', name: 'Spotify',   amount: 9,   cycle: 'monthly', category: 'Entertainment', color: '#1db954' },
  { id: 's3', name: 'Gym',       amount: 40,  cycle: 'monthly', category: 'Health',        color: '#f59e0b' },
  { id: 's4', name: 'iCloud',    amount: 3,   cycle: 'monthly', category: 'Storage',       color: '#3b82f6' },
];

const CATEGORY_OPTIONS = ['Entertainment', 'Health', 'Utilities', 'Storage', 'Food', 'Transport', 'Education', 'Other'];
const COLOR_OPTIONS = ['#e50914','#1db954','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#10b981','#f97316'];

const cycleLabel = (cycle: string) =>
  cycle === 'weekly' ? '/week' : cycle === 'yearly' ? '/year' : '/month';

const toMonthly = (amount: number, cycle: string) =>
  cycle === 'weekly' ? amount * 4.33 : cycle === 'yearly' ? amount / 12 : amount;

export default function BillsTab() {
  const [detectedBills, setDetectedBills] = useState<any[]>([]);
  const [manualBills, setManualBills]     = useState<ManualBill[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [showSample, setShowSample]       = useState(false);

  // form state
  const [form, setForm] = useState({
    name: '', amount: '', cycle: 'monthly' as ManualBill['cycle'],
    category: 'Entertainment', color: '#3b82f6',
  });

  useEffect(() => {
    const saved = localStorage.getItem('zenith-manual-bills');
    if (saved) setManualBills(JSON.parse(saved));
    db.getRecurring().then(b => { setDetectedBills(b); setLoading(false); });
  }, []);

  const saveBills = (updated: ManualBill[]) => {
    setManualBills(updated);
    localStorage.setItem('zenith-manual-bills', JSON.stringify(updated));
  };

  const addManual = () => {
    if (!form.name.trim() || !form.amount) return;
    const newBill: ManualBill = {
      id: Date.now().toString(),
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      cycle: form.cycle,
      category: form.category,
      color: form.color,
    };
    saveBills([...manualBills, newBill]);
    setForm({ name: '', amount: '', cycle: 'monthly', category: 'Entertainment', color: '#3b82f6' });
    setShowForm(false);
  };

  const addSampleData = () => {
    const merged = [...manualBills];
    SAMPLE_BILLS.forEach(s => {
      if (!merged.find(b => b.name === s.name)) merged.push(s);
    });
    saveBills(merged);
    setShowSample(false);
  };

  const removeBill = (id: string) => saveBills(manualBills.filter(b => b.id !== id));

  const totalMonthly = manualBills.reduce((sum, b) => sum + toMonthly(b.amount, b.cycle), 0)
    + detectedBills.reduce((sum, b) => sum + b.avg, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Recurring Bills</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
            Track subscriptions and detected recurring spending
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowSample(true)}
            style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer', fontSize: '13px' }}
          >
            📊 Add Sample Data
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
          >
            + Add Subscription
          </button>
        </div>
      </div>

      {/* ── Total Banner ── */}
      {(manualBills.length > 0 || detectedBills.length > 0) && (
        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.1))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Monthly Commitment</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>${totalMonthly.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{manualBills.length + detectedBills.length} bills tracked</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>~${(totalMonthly * 12).toFixed(0)}/year</div>
          </div>
        </div>
      )}

      {/* ── Add Form ── */}
      {showForm && (
        <div className="card" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px' }}>➕ New Subscription</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Name</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Netflix, Rent, Gym"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'var(--text)', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Amount ($)</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'var(--text)', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Billing Cycle</label>
              <select
                value={form.cycle}
                onChange={e => setForm({ ...form, cycle: e.target.value as ManualBill['cycle'] })}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(30,30,40,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'var(--text)', fontSize: '14px', boxSizing: 'border-box' }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(30,30,40,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'var(--text)', fontSize: '14px', boxSizing: 'border-box' }}
              >
                {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Color</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLOR_OPTIONS.map(c => (
                  <div
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '2px solid #fff' : '2px solid transparent', transition: 'border 0.15s' }}
                  />
                ))}
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={addManual} style={{ padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, cursor: 'pointer' }}>Add Bill</button>
          </div>
        </div>
      )}

      {/* ── Sample Data Confirm ── */}
      {showSample && (
        <div className="card" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <p style={{ margin: '0 0 12px', fontSize: '14px' }}>
            This will add <strong>Netflix, Spotify, Gym, iCloud</strong> as sample subscriptions so you can see how the Bills tab looks.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowSample(false)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={addSampleData} style={{ padding: '8px 18px', background: '#f59e0b', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, cursor: 'pointer' }}>Yes, Add Sample Data</button>
          </div>
        </div>
      )}

      {/* ── Manual Subscriptions ── */}
      {manualBills.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 14px', fontSize: '14px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Subscriptions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {manualBills.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: `1px solid ${b.color}22` }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${b.color}22`, border: `1.5px solid ${b.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                  {b.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{b.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{b.category} • {b.cycle}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: b.color }}>${b.amount}{cycleLabel(b.cycle)}</div>
                  {b.cycle !== 'monthly' && (
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>${toMonthly(b.amount, b.cycle).toFixed(2)}/mo</div>
                  )}
                </div>
                <button onClick={() => removeBill(b.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px', padding: '4px', lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Auto-Detected from Transactions ── */}
      <div className="card">
        <h3 style={{ margin: '0 0 14px', fontSize: '14px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🔍 Auto-Detected from Transactions
        </h3>
        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Analyzing your transactions...</p>
        ) : detectedBills.length === 0 ? (
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
              No recurring patterns detected yet. Log the same item 2+ times and it'll appear here automatically.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {detectedBills.map((b: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', border: '1.5px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                  🔄
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', textTransform: 'capitalize' }}>{b.name ?? b.vendor}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{b.category} • Detected {b.count}x</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#6366f1' }}>${b.avg}/month</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>avg</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Empty state when nothing at all ── */}
      {!loading && manualBills.length === 0 && detectedBills.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
          <p style={{ fontSize: '14px', marginBottom: '8px' }}>No bills tracked yet.</p>
          <p style={{ fontSize: '13px' }}>Click <strong>"+ Add Subscription"</strong> to add one manually, or <strong>"Add Sample Data"</strong> to see how it looks.</p>
        </div>
      )}

    </div>
  );
}