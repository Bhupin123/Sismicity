import React, { useEffect, useState } from 'react'
import { earthquakeService } from '../services/api'
import { useFilters } from '../hooks'
import EarthquakeMap from '../components/EarthquakeMap'
import { Panel } from '../components/UI'
import { SeismoBarChart } from '../components/Charts'
import FilterBar from '../components/FilterBar'

export default function MapView() {
  const { params } = useFilters()
  const [events,   setEvents]   = useState([])
  const [locations,setLocations] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      earthquakeService.getAll({ ...params, limit: 1500 }),
      earthquakeService.getByLocation({ limit: 15 }),
    ]).then(([e, l]) => {
      setEvents(e?.results || [])
      setLocations(l || [])
      setLoading(false)
    })
  }, [JSON.stringify(params)])

  return (
    <>
      <FilterBar />

      <Panel title=" Earthquake Epicenters" badge={`${events.length.toLocaleString()} EVENTS`}>
        {loading
          ? <div className="spinner" />
          : <EarthquakeMap events={events} height={480} />
        }
      </Panel>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <Panel title=" Top Locations by Count" badge="FREQUENCY">
          <SeismoBarChart data={locations} dataKey="count" xKey="place"
            color="#00c8ff" height={220} horizontal />
        </Panel>
        <Panel title=" Top Locations by Max Magnitude" badge="INTENSITY">
          <SeismoBarChart data={locations} dataKey="max_mag" xKey="place"
            color="#ff3d3d" height={220} horizontal />
        </Panel>
      </div>
    </>
  )
}
