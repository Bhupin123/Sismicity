import React, { useState, useRef, useEffect } from 'react'
import { chatService } from '../services/api'
import { Panel, WaveAnim, Btn } from '../components/UI'

const QUICK = [
  'How many total earthquakes are in the database?',
  'What was the largest earthquake recorded?',
  'Which locations are most seismically active?',
  'What is the recent trend in seismic activity?',
  'What is the average earthquake depth?',
]

export default function Chat() {
  const [messages, setMessages] = useState([{
    role: 'bot',
    text: ' Hello! I\'m SeismoIQ — your earthquake intelligence assistant powered by AI.\n\nAsk me anything about seismic patterns, statistics, locations, or trends in the data.',
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
      setMessages((m) => [...m, { role: 'bot', text: res.response || '⚠️ No response received.' }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', text: `⚠️ Error: ${e.message}` }])
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <Panel>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
        }}>
          <WaveAnim />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)' }}>SeismoIQ Chat Assistant</div>
            <div style={{ fontSize: 10, color: 'var(--txt2)', fontFamily: 'var(--mono)', marginTop: 1 }}>
              AI-POWERED EARTHQUAKE ANALYTICS
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,230,118,.08)', border: '1px solid rgba(0,230,118,.2)',
            padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: 'var(--ok)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)',
              animation: 'pulse 1.8s infinite' }} />
            LIVE
          </div>
        </div>

        {/* Quick questions */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUICK.map((q) => (
            <button key={q} onClick={() => send(q)} style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--bdr2)',
              background: 'var(--raised)', color: 'var(--txt2)',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => { e.target.style.borderColor = 'var(--plasma)'; e.target.style.color = 'var(--plasma)' }}
            onMouseLeave={(e) => { e.target.style.borderColor = 'var(--bdr2)';   e.target.style.color = 'var(--txt2)' }}>
              {q.length > 30 ? q.slice(0, 30) + '…' : q}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{ height: 380, overflowY: 'auto', padding: 14,
          display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              maxWidth: '82%',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              padding: '10px 14px', borderRadius: 10,
              fontSize: 13, lineHeight: 1.55,
              background: m.role === 'user'
                ? 'linear-gradient(135deg,rgba(0,200,255,.2),rgba(0,130,180,.15))'
                : 'var(--raised)',
              border: `1px solid ${m.role === 'user' ? 'rgba(0,200,255,.2)' : 'var(--border)'}`,
              borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
              whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </div>
          ))}
          {loading && (
            <div style={{
              alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '10px 10px 10px 2px',
              background: 'var(--raised)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {[0, 150, 300].map((d) => (
                <div key={d} style={{
                  width: 7, height: 7, background: 'var(--plasma)', borderRadius: '50%',
                  animation: `pulse 1.2s ${d}ms infinite`,
                }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, padding: 12,
          borderTop: '1px solid var(--border)' }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            value={input}
            placeholder="Ask about earthquake data, patterns, or statistics…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && send()}
          />
          <Btn onClick={() => send()} disabled={loading || !input.trim()}>
            Send ↵
          </Btn>
          {messages.length > 1 && (
            <Btn variant="secondary" onClick={() => setMessages([messages[0]])}>
              Clear
            </Btn>
          )}
        </div>
      </Panel>
    </div>
  )
}
