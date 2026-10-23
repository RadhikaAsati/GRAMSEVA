import { useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER = [20.5937, 78.9629]

function MapClickHandler({ location, onChange }) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      })
    },
  })

  return location ? (
    <CircleMarker
      center={[location.latitude, location.longitude]}
      radius={9}
      pathOptions={{
        color: '#166534',
        fillColor: '#22c55e',
        fillOpacity: 0.9,
      }}
    />
  ) : null
}

function MoveMap({ location }) {
  const map = useMap()

  if (location) {
    map.setView(
      [location.latitude, location.longitude],
      Math.max(map.getZoom(), 15),
    )
  }

  return null
}

export default function IssueLocationPicker({
  location,
  onLocationChange,
  village,
  ward,
  landmark,
  onManualChange,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const [showMap, setShowMap] = useState(false)

  async function searchPlaces(event) {
    event.preventDefault()

    const searchText = query.trim()

    if (!searchText) {
      setMessage('Enter a place, address, or landmark to search.')
      setResults([])
      return
    }

    setSearching(true)
    setMessage('')
    setResults([])

    try {
      const url = new URL(
        'https://nominatim.openstreetmap.org/search',
      )
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('limit', '5')
      url.searchParams.set('q', searchText)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error('Place search is temporarily unavailable.')
      }

      const places = await response.json()
      setResults(places)

      if (places.length === 0) {
        setMessage(
          'No matching places found. Try another search or select the map manually.',
        )
      }
    } catch (error) {
      setMessage(
        error.message ||
          'Could not search places. You can still select the map manually.',
      )
    } finally {
      setSearching(false)
    }
  }

  function selectPlace(place) {
    const latitude = Number(place.lat)
    const longitude = Number(place.lon)

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setMessage('This search result has invalid coordinates.')
      return
    }

    onLocationChange({ latitude, longitude })
    setQuery(place.display_name || '')
    setResults([])
    setMessage('Place selected. Check the pin on the map.')
  }

  return (
    <section className="issue-location-picker">
      <h3>Where is the issue?</h3>
      <p>
        Select the actual problem location, not necessarily your current
        location. You can search, place a pin, or enter the details manually.
      </p>

      <div className="issue-location-search">
        <label>
          Search address or landmark
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="e.g. village school, bus stop, street"
            maxLength={255}
          />
        </label>

        <button
          type="button"
          className="reference-secondary"
          disabled={searching}
          onClick={() => searchPlaces({ preventDefault() {} })}
        >
          {searching ? 'Searching…' : 'Search places'}
        </button>
      </div>

      {message && <p role="status">{message}</p>}

      {results.length > 0 && (
        <ul className="issue-location-results">
          {results.map(place => (
            <li key={place.place_id}>
              <button
                type="button"
                className="reference-secondary"
                onClick={() => selectPlace(place)}
              >
                {place.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="reference-secondary"
        aria-expanded={showMap}
        onClick={() => setShowMap(current => !current)}
      >
        {showMap ? 'Hide map' : 'Adjust exact location on map'}
      </button>

      {showMap && (
        <div className="issue-location-map-section">
            <p className="issue-location-map-hint">
              Click the map to place the pin at the actual issue location.
            </p>

        <MapContainer
          center={
            location
              ? [location.latitude, location.longitude]
              : DEFAULT_CENTER
          }
          zoom={location ? 15 : 5}
          scrollWheelZoom
          className="issue-location-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler
            location={location}
            onChange={onLocationChange}
          />
          <MoveMap location={location} />
        </MapContainer>
        </div>
      )}

      {location ? (
        <p role="status">
          Pin selected: {location.latitude.toFixed(6)},{' '}
          {location.longitude.toFixed(6)}
        </p>
      ) : (
        <p>No map location selected yet. You may still enter details manually.</p>
      )}

      <div className="issue-location-manual">
        <label>
          Village
          <input
            value={village}
            maxLength={150}
            onChange={event =>
              onManualChange('village', event.target.value)
            }
            placeholder="Enter village name"
          />
        </label>

        <label>
          Ward
          <input
            value={ward}
            maxLength={100}
            onChange={event =>
              onManualChange('ward', event.target.value)
            }
            placeholder="Enter ward number or name"
          />
        </label>

        <label>
          Landmark or additional directions
          <input
            value={landmark}
            maxLength={255}
            onChange={event =>
              onManualChange('landmark', event.target.value)
            }
            placeholder="e.g. near the school or water tank"
          />
        </label>
      </div>
    </section>
  )
}
