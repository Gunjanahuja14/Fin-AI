import type { Transaction } from '../models/Transaction';

export class SimpleDB {
  private txns: Transaction[] = [];
  private nextId = 1;

  async initialize() {
    try {
      const saved = localStorage.getItem('zenith-txns');
      if (saved) {
        this.txns = JSON.parse(saved) || [];
        this.nextId =
          this.txns.length > 0
            ? Math.max(...this.txns.map(t => t.id || 0)) + 1
            : 1;
      }
    } catch (err) {
      console.error("DB init failed:", err);
      this.txns = [];
      this.nextId = 1;
    }
  }

  async add(t: Omit<Transaction, 'id' | 'createdAt'>): Promise<void> {
    this.txns.push({
      ...t,
      id: this.nextId++,
      createdAt: new Date().toISOString()
    });
    this.save();
  }

  async getAll(): Promise<Transaction[]> {
    return [...this.txns].reverse();
  }

  // LAST 30 DAYS SUMMARY
  async getSummary() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const txns = this.txns.filter(t => new Date(t.date) >= cutoff);
    const total = txns.reduce((sum, t) => sum + t.amount, 0);
    const count = txns.length;

    return {
      total: parseFloat(total.toFixed(2)),
      count,
      avg: parseFloat((count > 0 ? total / count : 0).toFixed(2)),
    };
  }

  // CATEGORY BREAKDOWN
  async getCategories() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const txns = this.txns.filter(t => new Date(t.date) >= cutoff);
    const cats: Record<string, { amount: number; count: number }> = {};

    txns.forEach(t => {
      if (!cats[t.category]) cats[t.category] = { amount: 0, count: 0 };
      cats[t.category].amount += t.amount;
      cats[t.category].count += 1;
    });

    return Object.entries(cats)
      .map(([category, data]) => ({
        category,
        amount: parseFloat(data.amount.toFixed(2)),
        count: data.count
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // RECURRING SPENDS
  // FIX: Transaction model has `item` field (not description/vendor).
  // Group by: vendor (if set) → item (the actual purchase name) → category
  // This correctly detects "pizza bought twice" as recurring.
  async getRecurring() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const txns = this.txns.filter(t => new Date(t.date) >= cutoff);
    const byKey: Record<string, Transaction[]> = {};

    txns.forEach(t => {
      const vendor = t.vendor?.trim() ?? '';
      const item   = t.item?.trim() ?? '';
      // Priority: vendor → item → category
      const key = (vendor !== '' ? vendor : item !== '' ? item : t.category)
        .toLowerCase();

      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(t);
    });

    return Object.entries(byKey)
      .filter(([_, ts]) => ts.length >= 2)
      .map(([key, ts]) => {
        const totalSpent = ts.reduce((s, t) => s + t.amount, 0);
        return {
          name: key,                                              // what was bought
          category: ts[0].category,
          avg: parseFloat((totalSpent / ts.length).toFixed(2)),
          total: parseFloat(totalSpent.toFixed(2)),
          count: ts.length
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  // CURRENT CALENDAR MONTH TOTAL
  async getCurrentMonthTotal() {
    const now = new Date();

    const txns = this.txns.filter(t => {
      const d = new Date(t.date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });

    return parseFloat(
      txns.reduce((sum, t) => sum + t.amount, 0).toFixed(2)
    );
  }

  // AI READY FINANCIAL SNAPSHOT
  async getAISnapshot() {
    const summary    = await this.getSummary();
    const categories = await this.getCategories();
    const recurring  = await this.getRecurring();
    const monthTotal = await this.getCurrentMonthTotal();

    return {
      last30Days: summary,
      monthlyTotal: monthTotal,
      categories,
      recurring,
      transactionCount: this.txns.length
    };
  }

  private save() {
    localStorage.setItem('zenith-txns', JSON.stringify(this.txns));
  }
}

export const db = new SimpleDB();