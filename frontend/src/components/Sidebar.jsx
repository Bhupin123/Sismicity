import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { StatusDot } from './UI'
import styles from './Sidebar.module.css'

const NAV = [
  { to: '/',            icon: '', label: 'Overview'    },
  { to: '/map',         icon: '', label: 'Map View'    },
  { to: '/analytics',   icon: '', label: 'Analytics'   },
  { to: '/predictions', icon: '', label: 'AI Predict'  },
  { to: '/forecasting', icon: '', label: 'Forecasting' },
  { to: '/live',        icon: '', label: 'Live Feed'   },
  { to: '/chat',        icon: '', label: 'AI Chat'     },
  { to: '/alerts',      icon: '', label: 'Alerts'      },
]

export default function Sidebar() {
  const health      = useAppStore((s) => s.health)
  const wsConnected = useAppStore((s) => s.wsConnected)

  // Backend returns flat: { database, ml_models, forecasting, ... }
  // NOT nested under "services" — that was the bug
  const statusItems = [
    { label: 'Database',    on: !!health?.database    },
    { label: 'ML Models',   on: !!health?.ml_models   },
    { label: 'Forecasting', on: !!health?.forecasting  },
    { label: 'WebSocket',   on: wsConnected            },
  ]

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>SeismoIQ</div>
        <div className={styles.sub}>Intelligence Platform</div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>Navigation</div>
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }>
            <span className={styles.navIcon}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.status}>
        {statusItems.map((s) => (
          <StatusDot key={s.label} on={s.on} label={s.label} />
        ))}
      </div>
    </aside>
  )
}