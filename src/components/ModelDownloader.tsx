import { useState, useEffect } from 'react';
import { ModelManager, ModelCategory } from '@runanywhere/web';

export default function ModelDownloader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    // Check model status immediately and periodically
    checkAndLoadModel();
    const interval = setInterval(checkAndLoadModel, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkAndLoadModel = async () => {
    try {
      const model = ModelManager.getLoadedModel(ModelCategory.Language);
      if (model) {
        setIsLoaded(true);
        setStatusMsg('✓ Model loaded');
        return;
      }

      // If model not loaded in memory, try to load it
      if (!isLoading && !isLoaded) {
        setStatusMsg('Attempting to load from cache...');
        try {
          await ModelManager.loadModel('lfm2-350m-q4_k_m');
          const loadedModel = ModelManager.getLoadedModel(ModelCategory.Language);
          if (loadedModel) {
            setIsLoaded(true);
            setStatusMsg('✓ Loaded from cache');
            console.log('[Model] Loaded from cache');
          }
        } catch (err) {
          console.log('[Model] Not in cache, needs download');
        }
      }
    } catch (err) {
      console.error('[Model] Check error:', err);
    }
  };

  const downloadAndLoadModel = async () => {
    setIsLoading(true);
    setError('');
    setProgress(0);
    setStatusMsg('Starting download...');

    try {
      console.log('[Model] Starting download and load...');
      
      // Simulate download progress
      for (let i = 0; i <= 90; i += 10) {
        setProgress(i);
        setStatusMsg(`Downloading ${i}%...`);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setStatusMsg('Loading model into memory...');
      setProgress(95);

      // Load the model
      console.log('[Model] Calling loadModel...');
      await ModelManager.loadModel('lfm2-350m-q4_k_m');
      
      setProgress(100);
      setStatusMsg('Verifying...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify it loaded
      const model = ModelManager.getLoadedModel(ModelCategory.Language);
      if (model) {
        console.log('[Model] ✓ Successfully loaded and verified');
        setIsLoaded(true);
        setStatusMsg('✓ Model ready!');
        setProgress(0);
      } else {
        throw new Error('Model loaded but not detected');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[Model] Error:', errMsg);
      setError(`Failed: ${errMsg}`);
      setProgress(0);
      setStatusMsg('Error - try again');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoaded) {
    return (
      <div style={{ 
        padding: '16px', 
        background: 'rgba(16, 185, 129, 0.15)', 
        border: '2px solid rgba(16, 185, 129, 0.5)',
        borderRadius: '8px', 
        marginBottom: '16px' 
      }}>
        <div style={{ color: 'var(--primary)', fontWeight: '600', marginBottom: '4px', fontSize: '16px' }}>
          ✓ Model Ready!
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
          LLM is loaded. You can now chat with the AI Coach.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ 
        padding: '16px', 
        background: 'rgba(59, 130, 246, 0.15)', 
        border: '2px solid rgba(59, 130, 246, 0.5)',
        borderRadius: '8px', 
        marginBottom: '16px' 
      }}>
        <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '15px' }}>
          ⏳ Loading Model...
        </div>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ 
            width: '100%', 
            height: '10px', 
            background: 'rgba(0,0,0,0.3)', 
            borderRadius: '5px', 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              width: `${progress}%`, 
              height: '100%', 
              background: 'var(--primary)', 
              transition: 'width 0.3s',
              borderRadius: '5px'
            }} />
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {statusMsg} ({progress}%)
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '16px', 
      background: 'rgba(239, 68, 68, 0.15)', 
      border: '2px solid rgba(239, 68, 68, 0.5)',
      borderRadius: '8px', 
      marginBottom: '16px' 
    }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '15px' }}>
          📥 Download LLM Model
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
          250MB • 2-5 minutes • Downloaded once, cached forever
        </div>
      </div>
      <button 
        className="btn" 
        onClick={downloadAndLoadModel}
        disabled={isLoading}
        style={{ width: '100%', cursor: isLoading ? 'wait' : 'pointer' }}
      >
        {isLoading ? `${statusMsg} (${progress}%)` : 'Download & Load Model'}
      </button>
      {error && (
        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px', padding: '8px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '4px' }}>
          ❌ {error}
        </div>
      )}
      {statusMsg && !isLoading && !isLoaded && (
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
          Status: {statusMsg}
        </div>
      )}
    </div>
  );
}
