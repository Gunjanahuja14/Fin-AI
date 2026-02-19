import { useState, useEffect } from 'react';
import { initSDK } from './sdk';
import { db } from './services/db';
import DashboardTab from './components/DashboardTab';
import ExpenseTab from './components/ExpenseTab';
import CoachTab from './components/CoachTab';
import BillsTab from './components/BillsTab';

type Tab = 'dashboard' | 'expense' | 'coach' | 'bills';

export function App() {
  const [ready, setReady]           = useState(false);
  const [error, setError]           = useState('');
  const [tab, setTab]               = useState<Tab>('dashboard');
  const [showClear, setShowClear]   = useState(false);

  useEffect(() => {
    Promise.all([initSDK(), db.initialize()])
      .then(() => setReady(true))
      .catch((err) => setError(err.message));
  }, []);

  const clearAllData = () => {
    localStorage.removeItem('zenith-txns');
    localStorage.removeItem('zenith-manual-bills');
    location.reload();
  };

  if (error) return (
    <div className="app-loading" style={{ color: '#ef4444' }}>
      <h2>Error</h2>
      <p>{error}</p>
      <button className="btn" onClick={() => location.reload()}>Reload</button>
    </div>
  );

  if (!ready) return (
    <div className="app-loading">
      <div className="spinner" />
      <h2>Loading...</h2>
    </div>
  );

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>💰 Zenith AI Finance</h1>
        <button
          onClick={() => setShowClear(!showClear)}
          title="Settings"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px 8px', borderRadius: '8px', color: 'var(--muted)', lineHeight: 1 }}
        >
          ⚙️
        </button>
      </header>

      {/* ── Clear Data Confirm ── */}
      {showClear && (
        <div style={{ margin: '0 16px 12px', padding: '14px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#ef4444' }}>🗑️ Clear All Data</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>This will delete all transactions and bills permanently.</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowClear(false)}
              style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              onClick={clearAllData}
              style={{ padding: '7px 14px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
            >
              Yes, Clear All
            </button>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="tab-nav">
        {(['dashboard', 'expense', 'coach', 'bills'] as const).map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'dashboard' && '📊 Dashboard'}
            {t === 'expense'   && '💳 Log Expense'}
            {t === 'coach'     && '💬 Coach'}
            {t === 'bills'     && '📅 Bills'}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <div className="tab-content">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'expense'   && <ExpenseTab />}
        {tab === 'coach'     && <CoachTab />}
        {tab === 'bills'     && <BillsTab />}
      </div>

    </div>
  );
}