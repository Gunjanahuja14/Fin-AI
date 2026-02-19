import { useState, useEffect } from 'react';
import { aiService } from '../services/ai';
import { ModelManager, ModelCategory } from '@runanywhere/web';
import ModelDownloader from './ModelDownloader';

export default function CoachTab() {
  const [msgs, setMsgs] = useState<Array<{ role: string; text: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  // Continuously check if model is loaded
  useEffect(() => {
    const checkModel = () => {
      const model = ModelManager.getLoadedModel(ModelCategory.Language);
      setModelReady(model !== null);
      console.log('[Coach] Model ready:', model !== null);
    };

    checkModel();
    const interval = setInterval(checkModel, 1000);
    return () => clearInterval(interval);
  }, []);

  const ask = async () => {
    if (!input.trim()) return;

    // Final check before asking
    const isReady = aiService.isModelLoaded();
    console.log('[Coach] Asking - Model ready:', isReady);

    if (!isReady) {
      alert('⏳ Model is still loading or not ready. Please wait a moment and try again.');
      return;
    }

    const question = input.trim();
    setInput('');

    // add user message and a placeholder for coach
    setMsgs(prev => [...prev, { role: 'user', text: question }, { role: 'coach', text: '🤔 Thinking...' }]);
    setIsLoading(true);

    // streaming callback that appends tokens to the last message
    const handleToken = (token: string) => {
      setMsgs(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          const last = updated[updated.length - 1];
          // if placeholder still present, replace it; otherwise append
          const newText = last.text === '🤔 Thinking...' ? token : last.text + token;
          updated[updated.length - 1] = { role: 'coach', text: newText };
        }
        return updated;
      });
    };

    try {
      console.log('[Coach] Asking:', question);
      const response = await aiService.getAdvice(question, handleToken);
      console.log('[Coach] Got response:', response);

      // final update (in case streaming didn't finish exactly)
      setMsgs(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = { role: 'coach', text: response };
        }
        return updated;
      });
    } catch (err) {
      console.error('[Coach] Error:', err);
      setMsgs(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            role: 'coach',
            text: '❌ Error: ' + (err instanceof Error ? err.message : 'Unknown error'),
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Can I afford a $500 laptop?",
    "What are my top spending categories?",
    "How can I save money this month?",
    "Should I reduce my food budget?",
  ];

  return (
    <div>
      <ModelDownloader />
      
      <div className="card">
        <h2>💬 Financial Coach</h2>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
          Ask me about your spending. I'll give personalized advice based on your actual data.
        </p>

        <div style={{ 
          minHeight: '280px', 
          maxHeight: '380px', 
          overflow: 'auto', 
          background: 'rgba(0,0,0,0.2)', 
          borderRadius: '8px', 
          padding: '12px', 
          marginBottom: '12px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px' 
        }}>
          {msgs.length === 0 ? (
            <div style={{ color: 'var(--muted)', margin: 'auto', textAlign: 'center', fontSize: '14px' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>💰</div>
              <p>Ask your financial coach...</p>
              {!modelReady && <p style={{ fontSize: '12px', marginTop: '8px', color: '#ef4444' }}>⏳ Waiting for model...</p>}
            </div>
          ) : (
            msgs.map((m, i) => (
              <div key={i} style={{ 
                padding: '12px', 
                borderRadius: '8px',
                background: m.role === 'user' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                borderLeft: `3px solid ${m.role === 'user' ? '#3b82f6' : '#10b981'}`,
              }}>
                <strong style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                  {m.role === 'user' ? '👤 You' : '🤖 Coach'}
                </strong>
                <p style={{ lineHeight: '1.5', fontSize: '14px' }}>{m.text}</p>
              </div>
            ))
          )}
          {isLoading && (
            <div style={{ 
              padding: '12px', 
              color: 'var(--muted)',
              fontSize: '13px',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              ⏳ Coach is analyzing your finances...
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder={modelReady ? "Ask a question..." : "Waiting for model..."} 
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && modelReady && ask()} 
            disabled={isLoading || !modelReady}
            style={{ opacity: modelReady ? 1 : 0.5 }}
          />
          <button 
            className="btn" 
            onClick={ask} 
            disabled={isLoading || !input.trim() || !modelReady}
            style={{ padding: '10px 16px' }}
          >
            {isLoading ? '⏳' : '→'}
          </button>
        </div>

        {!modelReady && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
            ⬆️ Download the model above first to start chatting
          </div>
        )}

        {msgs.length === 0 && modelReady && (
          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <strong style={{ fontSize: '12px' }}>💡 Try asking:</strong>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  style={{
                    padding: '8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '6px',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                >
                  → {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
