import { useState } from 'react'
import { useLanguage } from '../i18n/index.jsx'
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
  const { language } = useLanguage()
  const text = {
    en: {
      heading: 'Where is the issue?',
      help: 'Select the actual problem location, not necessarily your current location. You can search, place a pin, or enter the details manually.',
      searchLabel: 'पता या पहचान की जगह खोजें',
      searchPlaceholder: 'e.g. village school, bus stop, street',
      searching: 'Searching…',
      search: 'Search places',
      hideMap: 'Hide map',
      adjustMap: 'Adjust exact location on map',
      mapHint: 'Click the map to place the pin at the actual issue location.',
      noLocation: 'अभी नक्शे पर जगह नहीं चुनी गई है। आप जानकारी खुद भर सकते हैं।',
      pinSelected: 'Pin selected:',
      village: 'Village',
      villagePlaceholder: 'Enter village name',
      ward: 'Ward',
      wardPlaceholder: 'Enter ward number or name',
      landmark: 'Landmark or additional directions',
      landmarkPlaceholder: 'e.g. near the school or water tank',
      enterSearch: 'Enter a place, address, or landmark to search.',
      unavailable: 'Place search is temporarily unavailable.',
      noResults: 'No matching places found. Try another search or select the map manually.',
      searchFailed: 'Could not search places. You can still select the map manually.',
      invalidCoordinates: 'This search result has invalid coordinates.',
      selected: 'Place selected. Check the pin on the map.',
    },
    hi: {
      heading: 'समस्या कहाँ है?',
      help: 'समस्या का सही स्थान चुनें। यह आपकी वर्तमान जगह से अलग भी हो सकता है। आप खोज सकते हैं, नक्शे पर पिन लगा सकते हैं या जानकारी खुद भर सकते हैं।',
      searchLabel: 'पता या पहचान की जगह खोजें',
      searchPlaceholder: 'जैसे गाँव का स्कूल, बस स्टॉप या सड़क',
      searching: 'खोज रहे हैं…',
      search: 'जगह खोजें',
      hideMap: 'नक्शा छिपाएँ',
      adjustMap: 'नक्शे पर सही जगह चुनें',
      mapHint: 'समस्या वाली सही जगह पर पिन लगाने के लिए नक्शे पर क्लिक करें।',
      noLocation: 'अभी नक्शे पर जगह नहीं चुनी गई है। आप जानकारी खुद भर सकते हैं।',
      pinSelected: 'चुना गया स्थान:',
      village: 'गाँव',
      villagePlaceholder: 'गाँव का नाम लिखें',
      ward: 'वार्ड',
      wardPlaceholder: 'वार्ड नंबर या नाम लिखें',
      landmark: 'पहचान की जगह या अतिरिक्त जानकारी',
      landmarkPlaceholder: 'जैसे स्कूल या पानी की टंकी के पास',
      enterSearch: 'खोजने के लिए जगह, पता या पहचान की जगह लिखें।',
      unavailable: 'अभी जगह खोजने की सुविधा उपलब्ध नहीं है।',
      noResults: 'कोई मिलती-जुलती जगह नहीं मिली। दूसरी जगह खोजें या नक्शे पर चुनें।',
      searchFailed: 'जगह खोजी नहीं जा सकी। आप नक्शे पर जगह चुन सकते हैं।',
      invalidCoordinates: 'इस खोज परिणाम के निर्देशांक सही नहीं हैं।',
      selected: 'जगह चुन ली गई है। नक्शे पर पिन जाँचें।',
    },
    mr: {
      heading: 'समस्या कुठे आहे?',
      help: 'समस्येचे अचूक ठिकाण निवडा. ते तुमच्या सध्याच्या ठिकाणापेक्षा वेगळे असू शकते. तुम्ही शोध घेऊ शकता, नकाशावर पिन लावू शकता किंवा माहिती स्वतः भरू शकता.',
      searchLabel: 'पत्ता किंवा जवळची खूण शोधा',
      searchPlaceholder: 'उदा. गावातील शाळा, बस थांबा किंवा रस्ता',
      searching: 'शोधत आहे…',
      search: 'ठिकाण शोधा',
      hideMap: 'नकाशा लपवा',
      adjustMap: 'नकाशावर अचूक ठिकाण निवडा',
      mapHint: 'समस्येच्या अचूक ठिकाणी पिन लावण्यासाठी नकाशावर क्लिक करा.',
      noLocation: 'अजून नकाशावर ठिकाण निवडलेले नाही. तुम्ही माहिती स्वतः भरू शकता.',
      pinSelected: 'निवडलेले ठिकाण:',
      village: 'गाव',
      villagePlaceholder: 'गावाचे नाव लिहा',
      ward: 'प्रभाग',
      wardPlaceholder: 'प्रभाग क्रमांक किंवा नाव लिहा',
      landmark: 'जवळची खूण किंवा अधिक माहिती',
      landmarkPlaceholder: 'उदा. शाळेजवळ किंवा पाण्याच्या टाकीजवळ',
      enterSearch: 'शोधण्यासाठी ठिकाण, पत्ता किंवा जवळची खूण लिहा.',
      unavailable: 'सध्या ठिकाण शोधण्याची सुविधा उपलब्ध नाही.',
      noResults: 'जुळणारे ठिकाण सापडले नाही. दुसरे शोधा किंवा नकाशावर निवडा.',
      searchFailed: 'ठिकाण शोधता आले नाही. तुम्ही नकाशावर ठिकाण निवडू शकता.',
      invalidCoordinates: 'या शोध परिणामाचे निर्देशांक चुकीचे आहेत.',
      selected: 'ठिकाण निवडले आहे. नकाशावरील पिन तपासा.',
    },
  }[language] || null
  const t = text || {
    heading: 'Where is the issue?',
    help: 'Select the actual problem location, not necessarily your current location. You can search, place a pin, or enter the details manually.',
    searchLabel: 'पता या पहचान की जगह खोजें',
    searchPlaceholder: 'e.g. village school, bus stop, street',
    searching: 'Searching…',
    search: 'Search places',
    hideMap: 'Hide map',
    adjustMap: 'Adjust exact location on map',
    mapHint: 'Click the map to place the pin at the actual issue location.',
    noLocation: 'अभी नक्शे पर जगह नहीं चुनी गई है। आप जानकारी खुद भर सकते हैं।',
    pinSelected: 'Pin selected:',
    village: 'Village',
    villagePlaceholder: 'Enter village name',
    ward: 'Ward',
    wardPlaceholder: 'Enter ward number or name',
    landmark: 'Landmark or additional directions',
    landmarkPlaceholder: 'e.g. near the school or water tank',
    enterSearch: 'Enter a place, address, or landmark to search.',
    unavailable: 'Place search is temporarily unavailable.',
    noResults: 'No matching places found. Try another search or select the map manually.',
    searchFailed: 'Could not search places. You can still select the map manually.',
    invalidCoordinates: 'This search result has invalid coordinates.',
    selected: 'Place selected. Check the pin on the map.',
  }
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const [showMap, setShowMap] = useState(false)

  async function searchPlaces(event) {
    event.preventDefault()

    const searchText = query.trim()

    if (!searchText) {
      setMessage(t.enterSearch)
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
        throw new Error(t.unavailable)
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
      setMessage(t.invalidCoordinates)
      return
    }

    onLocationChange({ latitude, longitude })
    setQuery(place.display_name || '')
    setResults([])
    setMessage(t.selected)
  }

  return (
    <section className="issue-location-picker">
      <h3>{t.heading}</h3>
      <p>
        {t.help}
      </p>

      <div className="issue-location-search">
        <label>
          पता या पहचान की जगह खोजें
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            maxLength={255}
          />
        </label>

        <button
          type="button"
          className="reference-secondary"
          disabled={searching}
          onClick={() => searchPlaces({ preventDefault() {} })}
        >
          {searching ? t.searching : t.search}
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
        {showMap ? t.hideMap : t.adjustMap}
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
          {t.pinSelected} {location.latitude.toFixed(6)},{' '}
          {location.longitude.toFixed(6)}
        </p>
      ) : (
        <p>अभी नक्शे पर जगह नहीं चुनी गई है। आप जानकारी खुद भर सकते हैं।</p>
      )}

      <div className="issue-location-manual">
        <label>
          {t.village}
          <input
            value={village}
            maxLength={150}
            onChange={event =>
              onManualChange('village', event.target.value)
            }
            placeholder={t.villagePlaceholder}
          />
        </label>

        <label>
          {t.ward}
          <input
            value={ward}
            maxLength={100}
            onChange={event =>
              onManualChange('ward', event.target.value)
            }
            placeholder={t.wardPlaceholder}
          />
        </label>

        <label>
          {t.landmark}
          <input
            value={landmark}
            maxLength={255}
            onChange={event =>
              onManualChange('landmark', event.target.value)
            }
            placeholder={t.landmarkPlaceholder}
          />
        </label>
      </div>
    </section>
  )
}
