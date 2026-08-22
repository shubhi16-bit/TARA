import {
  MapContainer,
  TileLayer,
  Polyline,
  Popup,
  CircleMarker,
  useMap,
  ZoomControl,
} from 'react-leaflet';

import { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';

type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

type Road = {
  id: string;
  name: string;
  score: number;
  riskLevel: RiskLevel;
  faultyLights: number;
  totalLights: number;
  crimeNearby: number;
  reports: number;
  nightExposure: number;
  coordinates: [number, number][];
};

type Crime = {
  id: string;
  type: string;
  lat: number;
  lng: number;
  time: string;
  severity: RiskLevel;
};

type Streetlight = {
  id: string;
  lat: number;
  lng: number;
  road: string;
};

type CommunityReport = {
  id: string;
  type: string;
  lat: number;
  lng: number;
  time: string;
  status: 'OPEN' | 'VERIFIED' | 'RESOLVED';
};

type MapData = {
  roads: Road[];
  crimes: Crime[];
  streetlights: Streetlight[];
  reports: CommunityReport[];
};

/* =========================================================
   DEMO DATA
   Used only until /api/map/overview is connected.
   ========================================================= */

const demoData: MapData = {
  roads: [
    {
      id: 'r1',
      name: 'Barakhamba Road',
      score: 32,
      riskLevel: 'MODERATE',
      faultyLights: 1,
      totalLights: 8,
      crimeNearby: 0,
      reports: 2,
      nightExposure: 72,
      coordinates: [
        [28.6315, 77.2197],
        [28.6310, 77.2220],
        [28.6304, 77.2245],
        [28.6297, 77.2270],
        [28.6290, 77.2295],
      ],
    },

    {
      id: 'r2',
      name: 'Janpath',
      score: 72,
      riskLevel: 'HIGH',
      faultyLights: 5,
      totalLights: 10,
      crimeNearby: 2,
      reports: 8,
      nightExposure: 38,
      coordinates: [
        [28.6315, 77.2197],
        [28.6300, 77.2195],
        [28.6285, 77.2192],
        [28.6268, 77.2190],
        [28.6250, 77.2187],
      ],
    },

    {
      id: 'r3',
      name: 'Sansad Marg',
      score: 58,
      riskLevel: 'HIGH',
      faultyLights: 3,
      totalLights: 9,
      crimeNearby: 1,
      reports: 5,
      nightExposure: 52,
      coordinates: [
        [28.6315, 77.2197],
        [28.6305, 77.2178],
        [28.6293, 77.2158],
        [28.6280, 77.2138],
        [28.6268, 77.2118],
      ],
    },

    {
    id: 'r4',
    name: 'Baba Kharak Singh Marg',
    score: 85,
    riskLevel: 'CRITICAL',
    faultyLights: 7,
    totalLights: 10,
    crimeNearby: 3,
    reports: 12,
    nightExposure: 24,

    coordinates: [
      [28.6339, 77.2168],
      [28.6344, 77.2157],
      [28.6350, 77.2145],
      [28.6357, 77.2135],
      [28.6364, 77.2128],
    ],
  },

    {
      id: 'r5',
      name: 'Kasturba Gandhi Marg',
      score: 45,
      riskLevel: 'MODERATE',
      faultyLights: 2,
      totalLights: 12,
      crimeNearby: 0,
      reports: 3,
      nightExposure: 66,
      coordinates: [
        [28.6315, 77.2197],
        [28.6330, 77.2195],
        [28.6345, 77.2192],
        [28.6360, 77.2190],
      ],
    },

    {
      id: 'r6',
      name: 'Tolstoy Marg',
      score: 22,
      riskLevel: 'LOW',
      faultyLights: 0,
      totalLights: 8,
      crimeNearby: 0,
      reports: 1,
      nightExposure: 81,
      coordinates: [
        [28.6315, 77.2197],
        [28.6328, 77.2210],
        [28.6340, 77.2225],
        [28.6352, 77.2240],
      ],
    },

    {
      id: 'r7',
      name: 'Minto Road',
      score: 65,
      riskLevel: 'HIGH',
      faultyLights: 4,
      totalLights: 8,
      crimeNearby: 1,
      reports: 6,
      nightExposure: 41,
      coordinates: [
        [28.6290, 77.2295],
        [28.6278, 77.2285],
        [28.6268, 77.2270],
      ],
    },

    {
      id: 'r8',
      name: 'Ashoka Road',
      score: 38,
      riskLevel: 'MODERATE',
      faultyLights: 1,
      totalLights: 6,
      crimeNearby: 0,
      reports: 2,
      nightExposure: 69,
      coordinates: [
        [28.6250, 77.2187],
        [28.6248, 77.2165],
        [28.6250, 77.2142],
      ],
    },

    {
    id: 'r9',
    name: 'Panchkuian Road',
    score: 91,
    riskLevel: 'CRITICAL',
    faultyLights: 8,
    totalLights: 10,
    crimeNearby: 2,
    reports: 15,
    nightExposure: 19,

    coordinates: [
      [28.6462, 77.2058],
      [28.6448, 77.2070],
      [28.6432, 77.2084],
      [28.6417, 77.2097],
      [28.6401, 77.2110],
    ],
  },

    {
      id: 'r10',
      name: 'Connaught Lane',
      score: 15,
      riskLevel: 'LOW',
      faultyLights: 0,
      totalLights: 6,
      crimeNearby: 0,
      reports: 0,
      nightExposure: 88,
      coordinates: [
        [28.6360, 77.2190],
        [28.6358, 77.2210],
        [28.6352, 77.2240],
      ],
    },
  ],

  crimes: [
    {
      id: 'c1',
      type: 'Theft',
      lat: 28.6322,
      lng: 77.2168,
      time: '10 mins ago',
      severity: 'HIGH',
    },
    {
      id: 'c2',
      type: 'Harassment',
      lat: 28.6272,
      lng: 77.2190,
      time: '1 hour ago',
      severity: 'CRITICAL',
    },
    {
      id: 'c3',
      type: 'Robbery',
      lat: 28.6348,
      lng: 77.2115,
      time: '3 hours ago',
      severity: 'HIGH',
    },
    {
      id: 'c4',
      type: 'Vandalism',
      lat: 28.6295,
      lng: 77.2155,
      time: '5 hours ago',
      severity: 'MODERATE',
    },
    {
      id: 'c5',
      type: 'Assault',
      lat: 28.6325,
      lng: 77.2145,
      time: '30 mins ago',
      severity: 'CRITICAL',
    },
  ],

  streetlights: [
    {
      id: 'sl1',
      lat: 28.6320,
      lng: 77.2160,
      road: 'Baba Kharak Singh Marg',
    },
    {
      id: 'sl2',
      lat: 28.6326,
      lng: 77.2145,
      road: 'Baba Kharak Singh Marg',
    },
    {
      id: 'sl3',
      lat: 28.6350,
      lng: 77.2115,
      road: 'Panchkuian Road',
    },
    {
      id: 'sl4',
      lat: 28.6280,
      lng: 77.2192,
      road: 'Janpath',
    },
    {
      id: 'sl5',
      lat: 28.6295,
      lng: 77.2162,
      road: 'Sansad Marg',
    },
  ],

  reports: [
    {
      id: 'rp1',
      type: 'Dark Area',
      lat: 28.6318,
      lng: 77.2165,
      time: '25 mins ago',
      status: 'OPEN',
    },
    {
      id: 'rp2',
      type: 'Broken Light',
      lat: 28.6290,
      lng: 77.2191,
      time: '42 mins ago',
      status: 'VERIFIED',
    },
  ],
};

/* =========================================================
   MAP CONFIG
   ========================================================= */

const cityCoordinates: Record<
  string,
  { center: [number, number]; zoom: number }
> = {
  'New Delhi': {
    center: [28.6315, 77.2190],
    zoom: 15,
  },

  Mumbai: {
    center: [19.0760, 72.8777],
    zoom: 14,
  },

  Metropolis: {
    center: [28.6315, 77.2190],
    zoom: 15,
  },
};

/* =========================================================
   HELPERS
   ========================================================= */

/* =========================================================
   RISK HELPERS
   ========================================================= */

function getRiskColor(score: number) {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 30) return '#eab308';
  return '#22c55e';
}

function getRiskLabel(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MODERATE';
  return 'LOW';
}

function getRiskWeight(score: number) {
  if (score >= 80) return 5;
  if (score >= 60) return 4.5;
  if (score >= 30) return 4;
  return 3.5;
}


/* =========================================================
   MAP CONTROLLER
   ========================================================= */

function MapController({
  selectedRoad,
}: {
  selectedRoad: Road | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedRoad) return;

    map.fitBounds(selectedRoad.coordinates, {
      padding: [80, 80],
      maxZoom: 16,
      animate: true,
    });
  }, [selectedRoad, map]);

  return null;
}


/* =========================================================
   SMALL MAP STAT
   ========================================================= */

function MapStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b111c]/90 px-3 py-2 backdrop-blur-md">
      <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>

      <p
        className="mt-0.5 text-lg font-bold leading-none"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}


/* =========================================================
   MAIN MAP
   ========================================================= */

export default function MapPage() {
  const [city, setCity] = useState('New Delhi');

  const [data, setData] = useState<MapData>(demoData);

  const [selectedRoad, setSelectedRoad] =
    useState<Road | null>(null);

  const [showCrimes, setShowCrimes] = useState(true);
  const [showLights, setShowLights] = useState(true);
  const [showReports, setShowReports] = useState(false);

  const [search, setSearch] = useState('');

  const [riskFilter, setRiskFilter] =
    useState<'ALL' | RiskLevel>('ALL');

  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);


  /* =======================================================
     CITY
     ======================================================= */

  useEffect(() => {
    const authCity = localStorage.getItem('authCity');

    if (authCity) {
      setCity(authCity);
    }
  }, []);


  /* =======================================================
     BACKEND
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadMapData() {
      try {
        setLoading(true);

        const API_URL =
          import.meta.env.VITE_API_URL ||
          'http://localhost:5000';

        const response = await fetch(
          `${API_URL}/api/map/overview?city=${encodeURIComponent(
            city
          )}`
        );

        if (!response.ok) {
          throw new Error('Map API unavailable');
        }

        const result = await response.json();

        if (!cancelled) {
          setData(result);
          setApiOnline(true);
        }
      } catch {
        if (!cancelled) {
          setData(demoData);
          setApiOnline(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMapData();

    const interval = setInterval(
      loadMapData,
      30000
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [city]);


  /* =======================================================
     FILTER ROADS
     ======================================================= */

  const filteredRoads = useMemo(() => {
    return data.roads.filter((road) => {
      const matchesSearch = road.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesRisk =
        riskFilter === 'ALL' ||
        road.riskLevel === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [data.roads, search, riskFilter]);


  /* =======================================================
     STATS
     ======================================================= */

  const criticalRoads = data.roads.filter(
    (r) => r.score >= 80
  ).length;

  const highRiskRoads = data.roads.filter(
    (r) => r.score >= 60 && r.score < 80
  ).length;

  const faultyLights = data.roads.reduce(
    (sum, road) => sum + road.faultyLights,
    0
  );


  const cityData =
    cityCoordinates[city] ||
    cityCoordinates['New Delhi'];


  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#070a10]">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="z-[1001] flex shrink-0 items-center justify-between border-b border-brand-border bg-brand-surface px-5 py-3">

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-brand-text">
            Live Operations — {city}
          </h2>

          <p className="text-[11px] text-brand-muted">
            Street-level safety intelligence
          </p>
        </div>


        <div className="flex items-center gap-3">

          {loading && (
            <span className="text-[10px] text-brand-muted">
              Updating...
            </span>
          )}

          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] ${
              apiOnline
                ? 'border-green-500/20 bg-green-500/5 text-green-400'
                : 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                apiOnline
                  ? 'animate-pulse bg-green-400'
                  : 'bg-yellow-400'
              }`}
            />

            {apiOnline ? 'Live' : 'Demo Data'}
          </div>

        </div>

      </header>


      {/* =================================================
          MAP
      ================================================= */}

      <div className="relative min-h-0 flex-1">

        <MapContainer
          key={city}
          center={cityData.center}
          zoom={cityData.zoom}
          zoomControl={false}
          attributionControl={true}
          style={{
            width: '100%',
            height: '100%',
            background: '#080b12',
          }}
        >

          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="© OpenStreetMap contributors © CARTO"
          />

          <ZoomControl position="bottomright" />

          <MapController
            selectedRoad={selectedRoad}
          />


          {/* =============================================
              ROAD RISK OVERLAY
          ============================================= */}

          {filteredRoads.map((road) => {

            const color =
              getRiskColor(road.score);

            const selected =
              selectedRoad?.id === road.id;

            return (
              <div key={road.id}>

                {/* subtle glow underneath */}
                <Polyline
                  positions={road.coordinates}
                  pathOptions={{
                    color,
                    weight:
                      getRiskWeight(road.score) + 7,
                    opacity: selected
                      ? 0.22
                      : 0.10,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />

                {/* actual risk road */}
                <Polyline
                  positions={road.coordinates}
                  pathOptions={{
                    color,
                    weight:
                      selected
                        ? getRiskWeight(
                            road.score
                          ) + 1.5
                        : getRiskWeight(
                            road.score
                          ),
                    opacity: selected
                      ? 1
                      : 0.9,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                  eventHandlers={{
                    click: () =>
                      setSelectedRoad(road),
                  }}
                >

                  <Popup>

                    <div className="min-w-[180px] font-sans text-gray-900">

                      <p className="text-sm font-semibold">
                        {road.name}
                      </p>

                      <div className="mt-2 flex items-end gap-2">

                        <span
                          className="text-2xl font-bold"
                          style={{
                            color,
                          }}
                        >
                          {road.score}
                        </span>

                        <span className="mb-1 text-[10px] text-gray-500">
                          /100
                        </span>

                      </div>

                      <p
                        className="mt-1 text-xs font-semibold"
                        style={{ color }}
                      >
                        {getRiskLabel(
                          road.score
                        )}
                      </p>

                    </div>

                  </Popup>

                </Polyline>

              </div>
            );
          })}


          {/* =============================================
              CRIME MARKERS
          ============================================= */}

          {showCrimes &&
            data.crimes.map((crime) => {

              const color =
                crime.severity === 'CRITICAL'
                  ? '#ef4444'
                  : crime.severity === 'HIGH'
                  ? '#f97316'
                  : '#eab308';

              return (
                <CircleMarker
                  key={crime.id}
                  center={[
                    crime.lat,
                    crime.lng,
                  ]}
                  radius={4}
                  pathOptions={{
                    color: '#fff',
                    weight: 1,
                    fillColor: color,
                    fillOpacity: 1,
                  }}
                >

                  <Popup>

                    <div className="min-w-[150px] font-sans text-gray-900">

                      <p className="text-sm font-semibold">
                        {crime.type}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {crime.time}
                      </p>

                      <p
                        className="mt-1 text-xs font-semibold"
                        style={{
                          color,
                        }}
                      >
                        {crime.severity}
                      </p>

                    </div>

                  </Popup>

                </CircleMarker>
              );
            })}


          {/* =============================================
              FAULTY LIGHTS
          ============================================= */}

          {showLights &&
            data.streetlights.map((light) => (

              <CircleMarker
                key={light.id}
                center={[
                  light.lat,
                  light.lng,
                ]}
                radius={4}
                pathOptions={{
                  color: '#fff',
                  weight: 1,
                  fillColor: '#facc15',
                  fillOpacity: 1,
                }}
              >

                <Popup>

                  <div className="font-sans text-gray-900">

                    <p className="text-sm font-semibold">
                      Faulty Streetlight
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {light.road}
                    </p>

                  </div>

                </Popup>

              </CircleMarker>

            ))}


          {/* =============================================
              COMMUNITY REPORTS
          ============================================= */}

          {showReports &&
            data.reports.map((report) => (

              <CircleMarker
                key={report.id}
                center={[
                  report.lat,
                  report.lng,
                ]}
                radius={4}
                pathOptions={{
                  color: '#fff',
                  weight: 1,
                  fillColor: '#a78bfa',
                  fillOpacity: 1,
                }}
              >

                <Popup>

                  <div className="font-sans text-gray-900">

                    <p className="text-sm font-semibold">
                      {report.type}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {report.time}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-purple-600">
                      {report.status}
                    </p>

                  </div>

                </Popup>

              </CircleMarker>

            ))}

        </MapContainer>


        {/* =================================================
            TOP LEFT STATS
        ================================================= */}

        <div className="pointer-events-none absolute left-4 top-4 z-[1000] flex gap-2">

          <MapStat
            label="Critical Roads"
            value={criticalRoads}
            color="#ef4444"
          />

          <MapStat
            label="High Risk"
            value={highRiskRoads}
            color="#f97316"
          />

          <MapStat
            label="Faulty Lights"
            value={faultyLights}
            color="#facc15"
          />

          <MapStat
            label="Reports"
            value={data.reports.length}
            color="#a78bfa"
          />

        </div>


        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="absolute right-4 top-4 z-[1000] w-[245px]">

          <div className="rounded-xl border border-white/10 bg-[#0d131e]/95 p-2 shadow-2xl backdrop-blur-xl">

            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3">

              <span className="text-xs text-slate-500">
                ⌕
              </span>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search road..."
                className="w-full bg-transparent py-2 text-[11px] text-white outline-none placeholder:text-slate-500"
              />

              {search && (
                <button
                  onClick={() =>
                    setSearch('')
                  }
                  className="text-slate-500 hover:text-white"
                >
                  ×
                </button>
              )}

            </div>


            <div className="mt-2 flex gap-1">

              {[
                ['ALL', 'All'],
                ['CRITICAL', 'Critical'],
                ['HIGH', 'High'],
                ['MODERATE', 'Moderate'],
                ['LOW', 'Low'],
              ].map(([value, label]) => (

                <button
                  key={value}
                  onClick={() =>
                    setRiskFilter(
                      value as
                        | 'ALL'
                        | RiskLevel
                    )
                  }
                  className={`rounded-md px-2 py-1 text-[8px] font-medium transition ${
                    riskFilter === value
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>

              ))}

            </div>

          </div>

        </div>


        {/* =================================================
            LAYERS
        ================================================= */}

        <div className="absolute bottom-5 left-4 z-[1000] w-[180px] rounded-xl border border-white/10 bg-[#0d131e]/95 p-3 shadow-xl backdrop-blur-xl">

          <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Map Layers
          </p>


          <label className="mb-2 flex cursor-pointer items-center justify-between">

            <span className="flex items-center gap-2 text-[10px] text-slate-300">

              <span className="h-2 w-2 rounded-full bg-red-500" />

              Crime reports

            </span>

            <input
              type="checkbox"
              checked={showCrimes}
              onChange={() =>
                setShowCrimes(!showCrimes)
              }
              className="accent-red-500"
            />

          </label>


          <label className="mb-2 flex cursor-pointer items-center justify-between">

            <span className="flex items-center gap-2 text-[10px] text-slate-300">

              <span className="h-2 w-2 rounded-full bg-yellow-400" />

              Faulty lights

            </span>

            <input
              type="checkbox"
              checked={showLights}
              onChange={() =>
                setShowLights(!showLights)
              }
              className="accent-yellow-400"
            />

          </label>


          <label className="flex cursor-pointer items-center justify-between">

            <span className="flex items-center gap-2 text-[10px] text-slate-300">

              <span className="h-2 w-2 rounded-full bg-purple-400" />

              Community reports

            </span>

            <input
              type="checkbox"
              checked={showReports}
              onChange={() =>
                setShowReports(!showReports)
              }
              className="accent-purple-400"
            />

          </label>

        </div>


        {/* =================================================
            ROAD DETAIL
        ================================================= */}

        {selectedRoad && (

          <div className="absolute right-4 top-[105px] z-[1000] w-[290px] overflow-hidden rounded-xl border border-white/10 bg-[#0d131e]/97 shadow-2xl backdrop-blur-xl">

            <div className="border-b border-white/10 p-4">

              <div className="flex items-start justify-between">

                <div>

                  <div className="flex items-center gap-2">

                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          getRiskColor(
                            selectedRoad.score
                          ),
                      }}
                    />

                    <h3 className="text-sm font-semibold text-white">
                      {selectedRoad.name}
                    </h3>

                  </div>

                  <p className="mt-1 text-[9px] text-slate-500">
                    Live road risk assessment
                  </p>

                </div>


                <button
                  onClick={() =>
                    setSelectedRoad(null)
                  }
                  className="text-lg leading-none text-slate-500 hover:text-white"
                >
                  ×
                </button>

              </div>


              <div className="mt-4 flex items-end justify-between">

                <div>

                  <p className="text-[8px] uppercase tracking-wider text-slate-500">
                    Risk Score
                  </p>

                  <p
                    className="mt-1 text-3xl font-bold"
                    style={{
                      color:
                        getRiskColor(
                          selectedRoad.score
                        ),
                    }}
                  >
                    {selectedRoad.score}
                  </p>

                </div>


                <span
                  className="rounded-full border px-2 py-1 text-[8px] font-semibold"
                  style={{
                    color:
                      getRiskColor(
                        selectedRoad.score
                      ),
                    borderColor: `${getRiskColor(
                      selectedRoad.score
                    )}40`,
                    backgroundColor: `${getRiskColor(
                      selectedRoad.score
                    )}12`,
                  }}
                >
                  {getRiskLabel(
                    selectedRoad.score
                  )}
                </span>

              </div>


              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">

                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${selectedRoad.score}%`,
                    backgroundColor:
                      getRiskColor(
                        selectedRoad.score
                      ),
                  }}
                />

              </div>

            </div>


            <div className="grid grid-cols-2 gap-2 p-4">

              <div className="rounded-lg bg-white/[0.025] p-3">

                <p className="text-[8px] uppercase text-slate-500">
                  Lighting
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedRoad.faultyLights}
                  <span className="text-slate-500">
                    {' '}
                    / {selectedRoad.totalLights}
                  </span>
                </p>

              </div>


              <div className="rounded-lg bg-white/[0.025] p-3">

                <p className="text-[8px] uppercase text-slate-500">
                  Crime
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedRoad.crimeNearby}
                </p>

              </div>


              <div className="rounded-lg bg-white/[0.025] p-3">

                <p className="text-[8px] uppercase text-slate-500">
                  Reports
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedRoad.reports}
                </p>

              </div>


              <div className="rounded-lg bg-white/[0.025] p-3">

                <p className="text-[8px] uppercase text-slate-500">
                  Night Exposure
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedRoad.nightExposure}
                </p>

              </div>

            </div>


            <div className="border-t border-white/10 p-3">

              <button
                onClick={() =>
                  window.location.href =
                    `/priority?road=${encodeURIComponent(
                      selectedRoad.name
                    )}`
                }
                className="w-full rounded-lg bg-primary px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-primary/90"
              >
                Open Action Priority →
              </button>

            </div>

          </div>

        )}


        {/* =================================================
            LEGEND
        ================================================= */}

        <div className="absolute bottom-5 right-4 z-[1000] rounded-xl border border-white/10 bg-[#0d131e]/95 p-3 shadow-xl backdrop-blur-xl">

          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Street Risk
          </p>

          <div className="space-y-1.5">

            {[
              ['Critical', '#ef4444'],
              ['High', '#f97316'],
              ['Moderate', '#eab308'],
              ['Low', '#22c55e'],
            ].map(([label, color]) => (

              <div
                key={label}
                className="flex items-center gap-2 text-[9px] text-slate-300"
              >

                <span
                  className="h-1 w-6 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 5px ${color}`,
                  }}
                />

                {label}

              </div>

            ))}

          </div>


          <div className="my-2 border-t border-white/10" />


          <div className="space-y-1.5">

            <div className="flex items-center gap-2 text-[9px] text-slate-300">

              <span className="h-2 w-2 rounded-full bg-red-500" />

              Crime

            </div>


            <div className="flex items-center gap-2 text-[9px] text-slate-300">

              <span className="h-2 w-2 rounded-full bg-yellow-400" />

              Faulty light

            </div>


            <div className="flex items-center gap-2 text-[9px] text-slate-300">

              <span className="h-2 w-2 rounded-full bg-purple-400" />

              Community report

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}