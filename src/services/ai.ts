import { ModelManager, ModelCategory } from '@runanywhere/web';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { db } from './db';

// ─── GREETING / SMALL TALK DETECTION ─────────────────────────────────────────
// If the user says "hii", "hello", "thanks" etc., don't dump financial data.
const SMALL_TALK_PATTERNS = [
  /^h+i+\s*$/i,           // hi, hii, hiii
  /^h+e+l+o+\s*$/i,       // hello, helo
  /^hey\s*$/i,
  /^good\s*(morning|evening|afternoon|night)/i,
  /^thanks?\s*(you)?\s*$/i,
  /^ok\s*$/i,
  /^okay\s*$/i,
  /^bye\s*$/i,
  /^how are you/i,
  /^what('s| is) up/i,
  /^sup\s*$/i,
  /^yo\s*$/i,
];

const SMALL_TALK_REPLIES: string[] = [
  "Hey! 👋 Ask me anything about your spending — like totals, recurring purchases, or category breakdowns.",
  "Hi there! I'm your financial coach. Ask me about your expenses and I'll give you precise insights.",
  "Hello! 💰 I'm ready to help. Try asking: 'What did I spend this month?' or 'Do I have recurring purchases?'",
  "Hey! Ask me something like 'What's my total spending?' or 'Which category do I spend most on?'",
];

function isSmallTalk(q: string): boolean {
  return SMALL_TALK_PATTERNS.some(p => p.test(q.trim()));
}

function randomSmallTalkReply(): string {
  return SMALL_TALK_REPLIES[Math.floor(Math.random() * SMALL_TALK_REPLIES.length)];
}

export const aiService = {
  isModelLoaded(): boolean {
    try {
      const model = ModelManager.getLoadedModel(ModelCategory.Language);
      return model !== null;
    } catch {
      return false;
    }
  },

  async getAdvice(question: string): Promise<string> {
    if (!this.isModelLoaded()) {
      return "❌ Model not loaded! Please download the LLM model first.";
    }

    // ── Handle greetings without touching financial data ──────────────────────
    if (isSmallTalk(question)) {
      return randomSmallTalkReply();
    }

    try {
      console.log('[AI] Question:', question);

      const snapshot = await db.getAISnapshot();
      const allTransactions = await db.getAll();
      const recentTxns = allTransactions.slice(0, 10);

      if (snapshot.transactionCount === 0) {
        return "No expense data available yet. Add some transactions first!";
      }

      // ─── PRE-COMPUTE EVERYTHING — LLM MUST NOT DO MATH ───────────────────
      const total30    = snapshot.last30Days.total;
      const count30    = snapshot.last30Days.count;
      const avg30      = snapshot.last30Days.avg;
      const monthTotal = snapshot.monthlyTotal;

      // Transaction list using correct `item` field
      const txnLines = recentTxns
        .map((t: Transaction, i: number) => {
          const vendor = t.vendor ? ` at ${t.vendor}` : '';
          return `${i + 1}. ${t.item}${vendor} [${t.category}]: $${t.amount}`;
        })
        .join('\n');

      // Category breakdown
      const catLines =
        snapshot.categories.length === 0
          ? 'None'
          : snapshot.categories
              .map((c: { category: string; amount: number; count: number }) => {
                const s = c.count > 1 ? 's' : '';
                return `  • ${c.category}: $${c.amount} (${c.count} transaction${s})`;
              })
              .join('\n');

      // Recurring — uses `name` field from updated db.ts
      const recurringLines =
        snapshot.recurring.length === 0
          ? 'NONE — no repeated purchases detected'
          : snapshot.recurring
              .map((r: { name: string; count: number; total: number; avg: number; category: string }) => {
                return `  • "${r.name}" [${r.category}] — bought ${r.count} times, total $${r.total}, avg $${r.avg} each`;
              })
              .join('\n');

      // ─── KEYWORD DETECTION — inject pre-computed answer directly ─────────
      // Small local LLMs will hallucinate math even when told not to.
      // The safest fix: detect the question type and inject the exact answer,
      // so the model just has to echo it back.
      const q = question.toLowerCase();

      let injectedFact = '';

      if (
        (q.includes('total') || q.includes('spent') || q.includes('spend') || q.includes('how much')) &&
        (q.includes('month') || q.includes('30') || q.includes('last') || q.includes('overall'))
      ) {
        injectedFact = `DIRECT ANSWER: Total spending in the last 30 days is exactly $${total30} across ${count30} transactions.`;

      } else if (q.includes('how much') && !q.includes('month')) {
        injectedFact = `DIRECT ANSWER: Total spending in the last 30 days is $${total30}.`;

      } else if (q.includes('recurring') || q.includes('repeat') || q.includes('regular') || q.includes('again')) {
        if (snapshot.recurring.length === 0) {
          injectedFact = `DIRECT ANSWER: There are NO recurring purchases in the last 90 days.`;
        } else {
          injectedFact = `DIRECT ANSWER: Yes, recurring purchases were found:\n${recurringLines}\nList all of them clearly.`;
        }

      } else if (q.includes('average') || q.includes('avg') || q.includes('per transaction')) {
        injectedFact = `DIRECT ANSWER: The average spending per transaction is $${avg30}.`;

      } else if (
        q.includes('categor') || q.includes('most') || q.includes('top') ||
        q.includes('where') || q.includes('breakdown')
      ) {
        injectedFact = `DIRECT ANSWER: Spending by category:\n${catLines}`;

      } else if (q.includes('how many') && q.includes('transaction')) {
        injectedFact = `DIRECT ANSWER: There are ${count30} transactions in the last 30 days.`;

      } else if (q.includes('this month') || q.includes('current month') || q.includes('calendar')) {
        injectedFact = `DIRECT ANSWER: Spending this calendar month is $${monthTotal}.`;
      }

      // ─── SYSTEM PROMPT ────────────────────────────────────────────────────
      const systemPrompt = `You are a precise financial assistant. Answer the user's question using ONLY the verified data provided.

RULES:
1. NEVER do arithmetic. All numbers are pre-calculated.
2. If a DIRECT ANSWER line is given, use those exact numbers in your reply.
3. Answer in 2-3 sentences maximum.
4. Do not speculate or add unsolicited advice.
5. Do not repeat the word "DIRECT ANSWER" in your response.`;

      // ─── USER PROMPT ──────────────────────────────────────────────────────
      const userPrompt = `VERIFIED FINANCIAL DATA — DO NOT RECALCULATE:

[ LAST 30 DAYS ]
Total spending: $${total30}
Transactions: ${count30}
Average per transaction: $${avg30}

[ THIS CALENDAR MONTH ]
Total: $${monthTotal}

[ RECENT TRANSACTIONS ]
${txnLines}

[ BY CATEGORY ]
${catLines}

[ RECURRING PURCHASES (90-day window) ]
${recurringLines}

${injectedFact ? `\n⚡ ${injectedFact}\n` : ''}
USER QUESTION: "${question}"

Answer using only the data above. 2-3 sentences max. No math.`;

      console.log('[AI] injectedFact:', injectedFact || '(open question)');

      const { stream, result } = await TextGeneration.generateStream(userPrompt, {
        maxTokens: 150,
        temperature: 0.1,
        systemPrompt,
      });

      let response = '';
      for await (const token of stream) {
        response += token;
      }

      await result;

      const cleaned = response.trim();

      if (!cleaned) {
        return `Total spending for the last 30 days is $${total30} across ${count30} transaction${count30 !== 1 ? 's' : ''}.`;
      }

      // ─── HALLUCINATION GUARD ──────────────────────────────────────────────
      // Catch patterns like "$400 × 3 = $1200" and replace with safe answer
      const mathHallucination = /\$[\d,]+\s*[×x*]\s*\d+\s*[=≈]\s*\$[\d,]+/gi;
      if (mathHallucination.test(cleaned)) {
        console.warn('[AI] Math hallucination detected — using fallback.');
        return `Total spending for the last 30 days is $${total30} across ${count30} transaction${count30 !== 1 ? 's' : ''}, with an average of $${avg30} per transaction.`;
      }

      return cleaned;

    } catch (err) {
      console.error('[AI] Error:', err);
      return `⚠️ AI Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  },

  async getTip(): Promise<string> {
    if (!this.isModelLoaded()) {
      return "💡 Download the model to get personalized tips!";
    }

    try {
      const snapshot = await db.getAISnapshot();
      const allTransactions = await db.getAll();
      const recentTxns = allTransactions.slice(0, 5);

      if (snapshot.transactionCount === 0) {
        return "💡 Start logging expenses to receive personalized tips.";
      }

      const topCat  = snapshot.categories[0];
      const total30 = snapshot.last30Days.total;

      // Use correct `item` field from Transaction model
      const txnLines = recentTxns
        .map((t: Transaction) => {
          const vendor = t.vendor ? ` at ${t.vendor}` : '';
          return `  • ${t.item}${vendor} [${t.category}]: $${t.amount}`;
        })
        .join('\n');

      const topCatLines = snapshot.categories
        .slice(0, 3)
        .map((c: { category: string; amount: number }) => `  • ${c.category}: $${c.amount}`)
        .join('\n');

      const prompt = `FINANCIAL DATA (do not recalculate):

Total spending last 30 days: $${total30}
Highest category: ${topCat?.category ?? 'N/A'} at $${topCat?.amount ?? 0}

Recent transactions:
${txnLines}

Top categories:
${topCatLines}

Give ONE specific, actionable money-saving tip using the exact dollar amounts above. One sentence only.`;

      const { stream, result } = await TextGeneration.generateStream(prompt, {
        maxTokens: 80,
        temperature: 0.2,
      });

      let response = '';
      for await (const token of stream) {
        response += token;
      }

      await result;

      return (
        response.trim() ||
        `💡 Your top spending category is ${topCat?.category ?? 'unknown'} at $${topCat?.amount ?? 0} — consider setting a weekly limit for it.`
      );

    } catch (err) {
      console.error('[AI] Tip error:', err);
      return "💡 Keep tracking your expenses consistently.";
    }
  },
};

// ─── Local type alias so we don't need to re-import everywhere ───────────────
type Transaction = {
  id?: number;
  amount: number;
  category: string;
  item: string;
  vendor: string | null;
  date: string;
  createdAt?: string;
};