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
  { to: '/chat',        icon: '', label: 'AI Chat'     },
]

export default function Sidebar() {
  const health      = useAppStore((s) => s.health)
  const wsConnected = useAppStore((s) => s.wsConnected)
  const svc         = health?.services || {}

  const statusItems = [
    { label: 'Database',    on: !!svc.database    },
    { label: 'ML Models',   on: !!svc.ml_models   },
    { label: 'Forecasting', on: !!svc.forecasting  },
    { label: 'WebSocket',   on: wsConnected        },
  ]

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.logo}>SeismoIQ</div>
        <div className={styles.sub}>Intelligence Platform</div>
      </div>

      {/* Nav */}
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

      {/* Status */}
      <div className={styles.status}>
        {statusItems.map((s) => (
          <StatusDot key={s.label} on={s.on} label={s.label} />
        ))}
      </div>
    </aside>
  )
}
