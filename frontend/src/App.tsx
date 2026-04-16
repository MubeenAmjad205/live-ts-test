import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Trash2, Settings2, Activity } from 'lucide-react';
import { useTranscription, type ModelSize } from './hooks/useTranscription';
import './App.css';

const App: React.FC = () => {
  const {
    isRecording,
    transcription,
    model,
    error,
    startRecording,
    stopRecording,
    setModel,
    clearTranscription
  } = useTranscription();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as transcription grows
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcription]);

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <Activity className="icon-pulse" />
          <h1>Realtime STT</h1>
        </div>
        
        <div className="controls">
          <div className="model-selector">
            <Settings2 className="settings-icon" />
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value as ModelSize)}
              disabled={isRecording}
            >
              <option value="tiny">Fast (Tiny)</option>
              <option value="base">Accurate (Base)</option>
            </select>
          </div>
          
          <button 
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            {isRecording ? 'Stop' : 'Start'}
          </button>

          <button className="clear-btn" onClick={clearTranscription}>
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}
        
        <div className="transcript-container" ref={scrollRef}>
          {transcription ? (
            <p className="transcript-text">
              {transcription}
              <span className="cursor-blink">|</span>
            </p>
          ) : (
            <div className="placeholder">
              <p>Click "Start" and speak into your microphone...</p>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="status-indicator">
          <div className={`dot ${isRecording ? 'active' : ''}`}></div>
          <span>{isRecording ? 'Listening...' : 'Idle'}</span>
        </div>
        <div className="model-badge">
          Model: {model}.en
        </div>
      </footer>
    </div>
  );
};

export default App;
