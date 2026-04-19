import React, { useState, useRef, useEffect } from 'react'
import { chatService } from '../services/api'

const QUICK = [
  'How many total earthquakes?',
  'Largest earthquake recorded?',
  'Most seismically active locations?',
  'Recent trend in seismic activity?',
  'Average earthquake depth?',
]

export default function Chat() {
  const [messages, setMessages] = useState([{
    role: 'bot',
    text: "Hello! I'm SeismoIQ — your earthquake intelligence assistant.\n\nAsk me anything about seismic patterns, statistics, trends, or predictions from the live database.",
  }])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef()
  const textareaRef           = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const send = async (text) => {
    const q = (text || input).trim()
    if (!q || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages(m => [...m, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await chatService.send(q)
      setMessages(m => [...m, { role: 'bot', text: res.response || 'No response received.' }])
    } catch (e) {
      setMessages(m => [...m, { role: 'bot', text: `Error: ${e.message}` }])
    }
    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !loading) send()
    }
  }

  const clearChat = () => setMessages(msgs => [msgs[0]])

  return (
    <>
      <style>{`
        @keyframes sq-bounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.4; }
          40%          { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes sq-pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes sq-wave {
          0%,100% { transform: scaleY(0.5); opacity: 0.6; }
          50%      { transform: scaleY(1);   opacity: 1; }
        }

        .sq-shell {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }

        /* ── header ── */
        .sq-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: var(--card);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .sq-avatar {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(0,230,118,.2), rgba(0,191,165,.12));
          border: 1px solid var(--bdr2);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sq-wave-mini {
          display: flex; gap: 2px; align-items: flex-end; height: 16px;
        }
        .sq-wave-mini span {
          width: 2.5px; background: var(--plasma); border-radius: 2px; display: inline-block;
        }
        .sq-header-info { flex: 1; min-width: 120px; }
        .sq-header-title { font-size: 13px; font-weight: 600; color: var(--txt); }
        .sq-header-sub {
          font-size: 9px; color: var(--txt2);
          font-family: var(--mono); letter-spacing: 0.7px; margin-top: 1px;
        }
        .sq-live-pill {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 9px; border-radius: 20px;
          background: rgba(0,230,118,.07); border: 1px solid rgba(0,230,118,.18);
          font-size: 9px; font-weight: 700; color: var(--ok);
          font-family: var(--mono); letter-spacing: 0.7px;
          flex-shrink: 0;
        }
        .sq-pulse-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--ok); animation: sq-pulse 1.8s infinite;
        }
        .sq-msg-stat {
          font-size: 9px; font-family: var(--mono); color: var(--txt2);
          text-align: right; flex-shrink: 0;
        }
        .sq-msg-stat strong { color: var(--plasma); font-size: 12px; display: block; }

        /* ── quick prompts ── */
        .sq-quick {
          display: flex; gap: 6px;
          padding: 8px 12px;
          overflow-x: auto; flex-shrink: 0;
          background: var(--card);
          border-bottom: 1px solid var(--border);
          scrollbar-width: none;
        }
        .sq-quick::-webkit-scrollbar { display: none; }
        .sq-qbtn {
          padding: 5px 11px; border-radius: 6px;
          font-size: 11px; font-weight: 500;
          border: 1px solid var(--bdr2);
          background: var(--raised); color: var(--txt2);
          white-space: nowrap; flex-shrink: 0;
          cursor: pointer; font-family: inherit;
          transition: all 0.18s;
        }
        .sq-qbtn:hover { border-color: var(--plasma); color: var(--plasma); background: rgba(0,230,118,.06); }

        /* ── messages ── */
        .sq-msgs {
          flex: 1;
          overflow-y: auto;
          padding: 14px 16px;
          display: flex; flex-direction: column; gap: 10px;
          scrollbar-width: thin;
          scrollbar-color: rgba(0,230,118,.15) transparent;
        }
        .sq-msgs::-webkit-scrollbar { width: 3px; }
        .sq-msgs::-webkit-scrollbar-thumb { background: rgba(0,230,118,.15); border-radius: 4px; }

        .sq-bubble {
          max-width: min(82%, 620px);
          padding: 10px 13px;
          font-size: 13px; line-height: 1.65;
          white-space: pre-wrap; word-break: break-word;
          border-radius: 12px;
        }
        .sq-bubble.bot {
          align-self: flex-start;
          background: var(--raised);
          border: 1px solid var(--border);
          border-bottom-left-radius: 3px;
          color: var(--txt);
        }
        .sq-bubble.user {
          align-self: flex-end;
          background: linear-gradient(135deg,rgba(0,200,255,.14),rgba(0,130,180,.10));
          border: 1px solid rgba(0,200,255,.2);
          border-bottom-right-radius: 3px;
          color: var(--txt);
        }
        .sq-blabel {
          font-size: 9px; font-weight: 700; letter-spacing: 0.8px;
          font-family: var(--mono); margin-bottom: 4px;
        }
        .sq-bubble.bot  .sq-blabel { color: var(--plasma); }
        .sq-bubble.user .sq-blabel { color: rgba(0,200,255,.7); text-align: right; }

        .sq-typing { display: flex; gap: 5px; align-items: center; padding: 3px 0; }
        .sq-typing span {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--plasma);
          animation: sq-bounce 1.2s infinite;
        }
        .sq-typing span:nth-child(2) { animation-delay: 0.15s; }
        .sq-typing span:nth-child(3) { animation-delay: 0.30s; }

        /* ── input bar ── */
        .sq-inputbar {
          padding: 10px 12px;
          border-top: 1px solid var(--border);
          background: var(--card);
          display: flex; gap: 8px; align-items: flex-end;
          flex-shrink: 0;
        }
        .sq-inputwrap {
          flex: 1; min-width: 0;
          background: var(--raised);
          border: 1px solid var(--bdr2);
          border-radius: 10px;
          padding: 8px 12px;
          display: flex; flex-direction: column; gap: 5px;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .sq-inputwrap:focus-within {
          border-color: rgba(0,230,118,.45);
          box-shadow: 0 0 0 3px rgba(0,230,118,.06);
        }
        .sq-textarea {
          width: 100%; min-height: 36px; max-height: 120px;
          resize: none; background: transparent;
          border: none; outline: none;
          color: var(--txt); font-size: 13px;
          font-family: inherit; line-height: 1.5;
          scrollbar-width: none;
        }
        .sq-textarea::placeholder { color: rgba(128,207,163,.35); }
        .sq-hint {
          font-size: 9px; color: rgba(128,207,163,.28);
          font-family: var(--mono);
        }
        .sq-sendbtn {
          padding: 9px 15px; border-radius: 8px;
          border: 1px solid var(--plasma);
          background: rgba(0,230,118,.12); color: var(--plasma);
          font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: all 0.18s; white-space: nowrap; flex-shrink: 0;
        }
        .sq-sendbtn:hover:not(:disabled) { background: rgba(0,230,118,.22); }
        .sq-sendbtn:disabled {
          opacity: 0.3; cursor: not-allowed;
          border-color: var(--bdr2); color: var(--txt2); background: transparent;
        }
        .sq-clearbtn {
          padding: 9px 12px; border-radius: 8px;
          border: 1px solid var(--border);
          background: transparent; color: var(--txt2);
          font-size: 12px; cursor: pointer;
          font-family: inherit; transition: all 0.18s; flex-shrink: 0;
        }
        .sq-clearbtn:hover { border-color: rgba(255,80,80,.3); color: rgba(255,100,100,.8); }

        /* ── responsive ── */
        @media (max-width: 600px) {
          .sq-header-sub { display: none; }
          .sq-live-pill  { display: none; }
          .sq-msg-stat   { display: none; }
          .sq-bubble     { max-width: 92%; font-size: 12px; }
          .sq-hint       { display: none; }
          .sq-sendbtn    { padding: 9px 11px; font-size: 11px; }
        }
      `}</style>

      <div className="sq-shell">

        {/* ── Header ── */}
        <div className="sq-header">
          <div className="sq-avatar">
            <div className="sq-wave-mini">
              {[8,13,16,13,8].map((h, i) => (
                <span key={i} style={{
                  height: h,
                  animation: `sq-wave 1.4s ease-in-out ${i * 0.15}s infinite`,
                }}/>
              ))}
            </div>
          </div>

          <div className="sq-header-info">
            <div className="sq-header-title">SeismoIQ Chat</div>
            <div className="sq-header-sub">AI-POWERED EARTHQUAKE ANALYTICS · GROQ LLAMA</div>
          </div>

          <div className="sq-live-pill">
            <div className="sq-pulse-dot"/>
            LIVE
          </div>

          <div className="sq-msg-stat">
            <strong>{messages.length}</strong>
            MESSAGES
          </div>
        </div>

        {/* ── Quick prompts ── */}
        <div className="sq-quick">
          {QUICK.map(q => (
            <button key={q} className="sq-qbtn" onClick={() => send(q)}>{q}</button>
          ))}
        </div>

        {/* ── Messages ── */}
        <div className="sq-msgs">
          {messages.map((m, i) => (
            <div key={i} className={`sq-bubble ${m.role}`}>
              <div className="sq-blabel">{m.role === 'bot' ? 'SEISMOIQ' : 'YOU'}</div>
              {m.text}
            </div>
          ))}

          {loading && (
            <div className="sq-bubble bot">
              <div className="sq-blabel">SEISMOIQ</div>
              <div className="sq-typing">
                <span/><span/><span/>
              </div>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* ── Input bar ── */}
        <div className="sq-inputbar">
          <div className="sq-inputwrap">
            <textarea
              ref={textareaRef}
              className="sq-textarea"
              value={input}
              placeholder="Ask about earthquake data…"
              rows={1}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKey}
            />
            <div className="sq-hint">ENTER to send · SHIFT+ENTER for newline</div>
          </div>

          <button
            className="sq-sendbtn"
            onClick={() => send()}
            disabled={loading || !input.trim()}
          >
            Send ↵
          </button>

          {messages.length > 1 && (
            <button className="sq-clearbtn" onClick={clearChat}>Clear</button>
          )}
        </div>

      </div>
    </>
  )
}