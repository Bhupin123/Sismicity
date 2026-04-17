import React, { useState, useRef, useEffect } from 'react'
import { chatService } from '../services/api'
import { Panel, WaveAnim, Btn } from '../components/UI'

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
    text: ' Hello! I\'m SeismoIQ — your earthquake intelligence assistant.\n\nAsk me anything about seismic patterns, statistics, or trends.',
  }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const q = (text || input).trim()
    if (!q) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await chatService.send(q)
      setMessages((m) => [...m, { role: 'bot', text: res.response || ' No response received.' }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', text: ` Error: ${e.message}` }])
    }
    setLoading(false)
  }

  return (
    // KEY FIX: full width with side padding, no overflow
    <div style={{
      width: '100%',
      maxWidth: 820,
      margin: '0 auto',
      padding: '0 8px',
      boxSizing: 'border-box',
    }}>
      <Panel style={{ width: '100%', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--card)', flexWrap: 'wrap',
        }}>
          <WaveAnim />
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)' }}>SeismoIQ Chat</div>
            <div style={{ fontSize: 9, color: 'var(--txt2)', fontFamily: 'var(--mono)', marginTop: 1 }}>
              AI-POWERED EARTHQUAKE ANALYTICS
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(0,230,118,.08)', border: '1px solid rgba(0,230,118,.2)',
            padding: '3px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, color: 'var(--ok)',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)', animation: 'pulse 1.8s infinite' }} />
            LIVE
          </div>
        </div>

        {/* Quick questions */}
        <div style={{
          padding: '8px 12px', borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 6, overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {QUICK.map((q) => (
            <button key={q} onClick={() => send(q)} style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--bdr2)',
              background: 'var(--raised)', color: 'var(--txt2)',
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => { e.target.style.borderColor = 'var(--plasma)'; e.target.style.color = 'var(--plasma)' }}
            onMouseLeave={(e) => { e.target.style.borderColor = 'var(--bdr2)'; e.target.style.color = 'var(--txt2)' }}>
              {q}
            </button>
          ))}
        </div>

        {/* Messages — fluid height instead of fixed 340px */}
        <div style={{
          height: 'clamp(200px, 45vh, 420px)',
          overflowY: 'auto', padding: 12,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              maxWidth: '88%',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              padding: '9px 13px',
              fontSize: 13, lineHeight: 1.55,
              background: m.role === 'user'
                ? 'linear-gradient(135deg,rgba(0,200,255,.2),rgba(0,130,180,.15))'
                : 'var(--raised)',
              border: `1px solid ${m.role === 'user' ? 'rgba(0,200,255,.2)' : 'var(--border)'}`,
              borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {m.text}
            </div>
          ))}
          {loading && (
            <div style={{
              alignSelf: 'flex-start', padding: '9px 13px',
              borderRadius: '10px 10px 10px 2px',
              background: 'var(--raised)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {[0, 150, 300].map((d) => (
                <div key={d} style={{
                  width: 6, height: 6, background: 'var(--plasma)', borderRadius: '50%',
                  animation: `pulse 1.2s ${d}ms infinite`,
                }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input — nowrap so Send button never drops below input */}
        <div style={{
          display: 'flex', gap: 8, padding: 10,
          borderTop: '1px solid var(--border)',
          flexWrap: 'nowrap', alignItems: 'center',
        }}>
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 0 }}
            value={input}
            placeholder="Ask about earthquake data…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && send()}
          />
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <Btn onClick={() => send()} disabled={loading || !input.trim()}>
              Send ↵
            </Btn>
            {messages.length > 1 && (
              <Btn variant="secondary" onClick={() => setMessages([messages[0]])}>
                Clear
              </Btn>
            )}
          </div>
        </div>

      </Panel>
    </div>
  )
}