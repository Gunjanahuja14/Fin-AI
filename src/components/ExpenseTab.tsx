import { useState, useEffect } from 'react';
import { db } from '../services/db';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Utilities', 'Education', 'Other'];

const CAT_ICONS: Record<string, string> = {
  Food: '🍔', Transport: '🚗', Entertainment: '🎬', Health: '💊',
  Shopping: '🛍️', Utilities: '💡', Education: '📚', Other: '📦',
};

const CAT_COLORS: Record<string, string> = {
  Food: '#f97316', Transport: '#3b82f6', Entertainment: '#a855f7',
  Health: '#10b981', Shopping: '#ec4899', Utilities: '#f59e0b',
  Education: '#06b6d4', Other: '#6b7280',
};

export default function ExpenseTab() {
  const [txns, setTxns]       = useState<any[]>([]);
  const [msg, setMsg]         = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    item: '', amount: '', category: 'Food', vendor: '',
  });

  const reload = async () => setTxns(await db.getAll());
  useEffect(() => { reload(); }, []);

  const add = async () => {
    const amount = parseFloat(form.amount);
    if (!form.item.trim()) { setMsg('❌ Please enter an item name'); return; }
    if (!amount || amount <= 0) { setMsg('❌ Please enter a valid amount'); return; }

    await db.add({
      amount,
      category: form.category,
      item: form.item.trim(),
      vendor: form.vendor.trim() || null,
      date: new Date().toISOString().split('T')[0],
    });

    setMsg(`✅ Added $${amount} for ${form.item}`);
    setForm({ item: '', amount: '', category: 'Food', vendor: '' });
    setShowForm(false);
    reload();
    setTimeout(() => setMsg(''), 3000);
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', color: 'var(--text)',
    fontSize: '14px', boxSizing: 'border-box' as const,
    outline: 'none',
  };

  const labelStyle = {
    fontSize: '12px', color: 'var(--muted)',
    display: 'block', marginBottom: '6px', fontWeight: 500,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Log Expense</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>Track your daily spending</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setMsg(''); }}
          style={{ padding: '9px 18px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
        >
          {showForm ? '✕ Cancel' : '+ Add Expense'}
        </button>
      </div>

      {/* ── Success Message ── */}
      {msg && (
        <div style={{ padding: '12px 16px', background: msg.startsWith('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${msg.startsWith('❌') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: '8px', fontSize: '14px' }}>
          {msg}
        </div>
      )}

      {/* ── Add Form ── */}
      {showForm && (
        <div className="card" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: '0 0 18px', fontSize: '15px' }}>New Expense</h3>

          {/* Category Picker */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setForm({ ...form, category: cat })}
                  style={{
                    padding: '7px 13px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                    border: form.category === cat ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    background: form.category === cat ? CAT_COLORS[cat] : 'rgba(255,255,255,0.06)',
                    color: form.category === cat ? '#fff' : 'var(--muted)',
                    fontWeight: form.category === cat ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {CAT_ICONS[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Item / Description</label>
              <input
                value={form.item}
                onChange={e => setForm({ ...form, item: e.target.value })}
                placeholder="e.g. Pizza, Uber ride, Netflix..."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Amount ($)</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && add()}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Vendor / Store <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
              <input
                value={form.vendor}
                onChange={e => setForm({ ...form, vendor: e.target.value })}
                placeholder="e.g. Dominos, Uber..."
                style={inputStyle}
              />
            </div>
          </div>

          <button
            onClick={add}
            style={{ marginTop: '18px', width: '100%', padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#000', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
          >
            Save Expense
          </button>
        </div>
      )}

      {/* ── Recent Transactions ── */}
      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Transactions</h3>

        {txns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>💸</div>
            <p style={{ fontSize: '14px' }}>No expenses yet. Add your first one!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {txns.slice(0, 15).map((t: any) => {
              const color = CAT_COLORS[t.category] ?? '#6b7280';
              const icon  = CAT_ICONS[t.category]  ?? '📦';
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 13px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', borderLeft: `3px solid ${color}` }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.item}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      <span style={{ background: `${color}22`, color, padding: '1px 7px', borderRadius: '10px', fontWeight: 600 }}>{t.category}</span>
                      {t.vendor && <span style={{ marginLeft: '6px' }}>@ {t.vendor}</span>}
                      <span style={{ marginLeft: '6px' }}>{t.date}</span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color, flexShrink: 0 }}>
                    ${t.amount}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}