import React from 'react'
import { useAppStore } from '../store/useAppStore'
import { FilterBtn } from './UI'

const TIME_BTNS = [
  { label: 'All Time', value: null },
  { label: '1 Year',   value: 365  },
  { label: '6 Months', value: 180  },
  { label: '1 Month',  value: 30   },
  { label: '7 Days',   value: 7    },
]
const MAG_BTNS = [
  { label: 'All',  value: null },
  { label: 'M4+',  value: 4   },
  { label: 'M5+',  value: 5   },
  { label: 'M6+',  value: 6   },
]

export default function FilterBar() {
  const { filters, setFilter } = useAppStore()

  return (
    <div className="filter-bar">
      <span className="filter-label">Time</span>
      <div className="filter-group">
        {TIME_BTNS.map((b) => (
          <FilterBtn key={b.label} label={b.label}
            active={filters.days === b.value}
            onClick={() => setFilter('days', b.value)} />
        ))}
      </div>

      <div className="filter-divider" />

      <span className="filter-label">Min Magnitude</span>
      <div className="filter-group">
        {MAG_BTNS.map((b) => (
          <FilterBtn key={b.label} label={b.label}
            active={filters.minMag === b.value}
            onClick={() => setFilter('minMag', b.value)} />
        ))}
      </div>
    </div>
  )
}
