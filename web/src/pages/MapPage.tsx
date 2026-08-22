import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Popup,
  CircleMarker,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { useTaraData } from '../hooks/useTaraData';
import type { RiskLevel } from '../services/riskEngine';
import { Shield, AlertTriangle, Lightbulb, FileText, Flame } from 'lucide-react';

const cityCoordinates: Record<
  string,
  { center: [number, number]; zoom: number }
> = {
  'New Delhi': {
    center: [28.6315, 77.2190],
    zoom: 14,
  },
  'Mumbai': {
    center: [19.0760, 72.8777],
    zoom: 13,
  },
  'Metropolis': {
    center: [28.6315, 77.2190],
    zoom: 14,
  },
};

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

function getRiskWeight(score: number, isSelected: boolean) {
  if (isSelected) return 8;
  if (score >= 80) return 5.5;
  if (score >= 60) return 4.5;
  if (score >= 30) return 4;
  return 3.5;
}

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
    <div className="rounded-lg border border-brand-border bg-brand-surface/95 px-3 py-2 backdrop-blur-md shadow-sm">
      <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
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

// Heatmap Layer using leaflet.heat
function HeatmapLayer({
  points,
  show,
}: {
  points: [number, number, number][];
  show: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !show || points.length === 0) return;

    const heat = (L as any).heatLayer(points, {
      radius: 30,
      blur: 22,
      maxZoom: 16,
      max: 1.0,
      minOpacity: 0.3,
      gradient: {
        0.15: '#22c55e', // Low risk
        0.40: '#eab308', // Moderate
        0.70: '#f97316', // High
        0.95: '#ef4444', // Critical
      },
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points, show]);

  return null;
}

// Controller to smoothly fit to selected road
function MapFocusController({
  selectedCoordinates,
}: {
  selectedCoordinates?: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedCoordinates && selectedCoordinates.length > 0) {
      const bounds = L.latLngBounds(selectedCoordinates);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
    }
  }, [map, selectedCoordinates]);

  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const { roads, crimes, streetlights, reports, loading, city, profileError } = useTaraData();

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showCrimes, setShowCrimes] = useState(true);
  const [showLights, setShowLights] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [search, setSearch] = useState(urlSearch);
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);

  // Sync URL search param if changed externally
  useEffect(() => {
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  const filteredRoads = useMemo(() => {
    return roads.filter((road) => {
      const matchesSearch = road.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesRisk =
        riskFilter === 'ALL' || road.riskLevel === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [roads, search, riskFilter]);

  // If user searched for a specific road, auto-select it
  useEffect(() => {
    if (search.trim()) {
      const match = roads.find((r) => r.name.toLowerCase().includes(search.toLowerCase()));
      if (match) {
        setSelectedRoadId(match.id);
      }
    }
  }, [search, roads]);

  const selectedRoad = useMemo(() => {
    return roads.find((r) => r.id === selectedRoadId);
  }, [roads, selectedRoadId]);

  // Derived heatmap points with weighted intensities
  const heatmapPoints = useMemo(() => {
    const points: [number, number, number][] = [];

    // 1. Road risk coordinates
    for (const road of roads) {
      const intensity = Math.max(0.15, Math.min(1.0, road.score / 100));
      if (road.coordinates && road.coordinates.length > 0) {
        for (const pt of road.coordinates) {
          points.push([pt[0], pt[1], intensity]);
        }
      }
    }

    // 2. Crime reports
    for (const crime of crimes) {
      if (crime.lat && crime.lng) {
        const intensity =
          crime.severity === 'CRITICAL' ? 1.0 :
          crime.severity === 'HIGH' ? 0.8 :
          crime.severity === 'MODERATE' ? 0.5 : 0.3;
        points.push([crime.lat, crime.lng, intensity]);
      }
    }

    // 3. Faulty streetlights
    for (const light of streetlights) {
      if (light.lat && light.lng && (light.status === 'faulty' || light.status === 'broken')) {
        points.push([light.lat, light.lng, 0.75]);
      }
    }

    // 4. Community reports
    for (const report of reports) {
      if (report.lat && report.lng) {
        const intensity = report.status === 'OPEN' ? 0.8 : report.status === 'VERIFIED' ? 0.6 : 0.3;
        points.push([report.lat, report.lng, intensity]);
      }
    }

    return points;
  }, [roads, crimes, streetlights, reports]);

  const criticalRoads = roads.filter((r) => r.score >= 80).length;
  const highRiskRoads = roads.filter((r) => r.score >= 60 && r.score < 80).length;
  const faultyLightsCount = streetlights.filter((l) => l.status === 'faulty' || l.status === 'broken').length;

  const cityConfig = cityCoordinates[city] || cityCoordinates['New Delhi'] || {
    center: [28.6315, 77.2190] as [number, number],
    zoom: 14,
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-brand-dark">
      {/* HEADER */}
      <header className="z-[1001] flex shrink-0 items-center justify-between border-b border-brand-border bg-brand-surface px-5 py-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-brand-text">
            Live Operations — {city || 'Authority Command'}
          </h2>
          <p className="text-[11px] text-brand-muted">
            Street-level safety intelligence and real-time risk heatmap from Firestore
          </p>
        </div>

        <div className="flex items-center gap-3">
          {loading && (
            <span className="text-[10px] text-brand-muted">
              Syncing...
            </span>
          )}

          <div className="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-[10px] text-green-500 font-medium">
            <span className="h-1.5 w-1.5 animate-pulse bg-green-500 rounded-full" />
            Live Firestore
          </div>
        </div>
      </header>

      {profileError && (
        <div className="z-[1002] bg-risk-crit/10 border-b border-risk-crit/20 px-5 py-2 text-xs text-risk-crit">
          {profileError}
        </div>
      )}

      {/* MAP VIEWPORT */}
      <div className="relative min-h-0 flex-1">
        <MapContainer
          key={city}
          center={cityConfig.center}
          zoom={cityConfig.zoom}
          zoomControl={false}
          attributionControl={true}
          style={{
            width: '100%',
            height: '100%',
            background: 'var(--brand-dark)',
          }}
        >
          {/* Base: Dark Carto Map */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="© OpenStreetMap contributors © CARTO"
          />

          <ZoomControl position="bottomright" />

          {/* Layer 1: Risk Heatmap */}
          <HeatmapLayer points={heatmapPoints} show={showHeatmap} />

          {/* Map auto-focus controller */}
          <MapFocusController selectedCoordinates={selectedRoad?.coordinates} />

          {/* Layer 2: Colored Road Risk Lines */}
          {filteredRoads.map((road) => {
            if (!road.coordinates || road.coordinates.length < 2) return null;
            const isSelected = selectedRoadId === road.id;
            const color = getRiskColor(road.score);

            return (
              <Polyline
                key={road.id}
                positions={road.coordinates}
                eventHandlers={{
                  click: () => setSelectedRoadId(road.id),
                }}
                pathOptions={{
                  color,
                  weight: getRiskWeight(road.score, isSelected),
                  opacity: isSelected ? 1.0 : 0.92,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: isSelected ? '8, 4' : undefined,
                }}
              >
                <Popup>
                  <div className="min-w-[200px] font-sans text-gray-900">
                    <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                      <p className="text-sm font-bold text-gray-900">{road.name}</p>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold border"
                        style={{
                          color: getRiskColor(road.score),
                          borderColor: `${getRiskColor(road.score)}40`,
                          backgroundColor: `${getRiskColor(road.score)}15`,
                        }}
                      >
                        {getRiskLabel(road.score)}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-black font-mono" style={{ color: getRiskColor(road.score) }}>
                        {road.score}
                      </span>
                      <span className="text-xs text-gray-500">/ 100 Risk Score</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600 mb-2.5 bg-gray-50 p-2 rounded border border-gray-100">
                      <div>Faulty Lights: <b className="text-gray-900">{road.faultyLights}/{road.totalLights || 10}</b></div>
                      <div>Crimes: <b className="text-gray-900">{road.crimeNearby}</b></div>
                      <div>Active Reports: <b className="text-gray-900">{road.reports}</b></div>
                      <div>Footfall Est: <b className="text-gray-900">{road.nightExposure}%</b></div>
                    </div>

                    {road.factors && (
                      <div className="mb-3 border-t border-gray-200 pt-2 text-[11px] text-gray-600">
                        <div className="font-semibold text-gray-800 mb-1 flex items-center justify-between">
                          <span>Calculated Risk Factors</span>
                          <span className="text-[10px] text-gray-500 font-normal">Deterministic</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                          <div>Crime (35%): <b className="text-gray-900">{road.factors.crime}</b></div>
                          <div>Lighting (25%): <b className="text-gray-900">{road.factors.lighting}</b></div>
                          <div>Reports (15%): <b className="text-gray-900">{road.factors.communityReports}</b></div>
                          <div>Footfall (15%): <b className="text-gray-900">{road.factors.footfall}</b></div>
                          <div className="col-span-2">Recency (10%): <b className="text-gray-900">{road.factors.recency}</b></div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => navigate('/priority')}
                      className="w-full py-1 text-center bg-gray-900 hover:bg-black text-white text-[11px] font-medium rounded transition"
                    >
                      Dispatch Intervention →
                    </button>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Layer 3: Markers */}
          {/* Crime Markers */}
          {showCrimes &&
            crimes.map((crime) => {
              if (!crime.lat || !crime.lng) return null;
              const color =
                crime.severity === 'CRITICAL'
                  ? '#ef4444'
                  : crime.severity === 'HIGH'
                  ? '#f97316'
                  : '#eab308';

              return (
                <CircleMarker
                  key={crime.id}
                  center={[crime.lat, crime.lng]}
                  radius={5}
                  pathOptions={{
                    color: '#fff',
                    weight: 1.5,
                    fillColor: color,
                    fillOpacity: 0.95,
                  }}
                >
                  <Popup>
                    <div className="min-w-[170px] font-sans text-gray-900">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle size={14} className="text-red-500" />
                        <p className="text-sm font-bold text-gray-900">{crime.type}</p>
                      </div>
                      <p className="text-xs text-gray-700 mb-1.5">{crime.desc}</p>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t">
                        <span>{crime.time}</span>
                        <span className="font-semibold" style={{ color }}>{crime.severity}</span>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          {/* Streetlight Markers */}
          {showLights &&
            streetlights.map((light) => {
              if (!light.lat || !light.lng) return null;
              const isFaulty = light.status === 'faulty' || light.status === 'broken';
              return (
                <CircleMarker
                  key={light.id}
                  center={[light.lat, light.lng]}
                  radius={4.5}
                  pathOptions={{
                    color: '#fff',
                    weight: 1,
                    fillColor: isFaulty ? '#facc15' : '#22c55e',
                    fillOpacity: 0.95,
                  }}
                >
                  <Popup>
                    <div className="min-w-[150px] font-sans text-gray-900">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Lightbulb size={14} className={isFaulty ? 'text-yellow-500' : 'text-green-500'} />
                        <p className="text-sm font-semibold text-gray-900">
                          Light: <span className="capitalize">{light.status}</span>
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">{light.road}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          {/* Community Reports Markers */}
          {showReports &&
            reports.map((report) => {
              if (!report.lat || !report.lng) return null;
              return (
                <CircleMarker
                  key={report.id}
                  center={[report.lat, report.lng]}
                  radius={5}
                  pathOptions={{
                    color: '#fff',
                    weight: 1.5,
                    fillColor: '#8b5cf6',
                    fillOpacity: 0.95,
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px] font-sans text-gray-900">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FileText size={14} className="text-purple-500" />
                        <p className="text-sm font-bold text-gray-900">{report.issueType || report.type}</p>
                      </div>
                      {report.road && (
                        <p className="text-[11px] font-semibold text-purple-700 mb-0.5">📍 {report.road}</p>
                      )}
                      <p className="text-xs text-gray-700 mb-1.5">{report.notes || report.desc}</p>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t">
                        <span>{report.time}</span>
                        <span className="font-semibold text-purple-600 uppercase">Status: {report.status}</span>
                      </div>
                      {(report.imageUrl || (report.photoUrls && report.photoUrls.length > 0)) && (
                        <div className="mt-2">
                          <img
                            src={report.imageUrl || (report.photoUrls ? report.photoUrls[0] : '')}
                            alt="Report evidence"
                            className="h-20 w-full object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
        </MapContainer>

        {/* TOP LEFT STATS */}
        <div className="pointer-events-none absolute left-4 top-4 z-[1000] flex gap-2">
          <MapStat label="Critical Roads" value={criticalRoads} color="#ef4444" />
          <MapStat label="High Risk" value={highRiskRoads} color="#f97316" />
          <MapStat label="Faulty Lights" value={faultyLightsCount} color="#facc15" />
          <MapStat label="Reports" value={reports.length} color="#8b5cf6" />
        </div>

        {/* SEARCH & FILTERS */}
        <div className="absolute right-4 top-4 z-[1000] w-[250px]">
          <div className="rounded-xl border border-brand-border bg-brand-surface/95 p-2 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-dark/50 px-3">
              <span className="text-xs text-brand-muted">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search road..."
                className="w-full bg-transparent py-2 text-[11px] text-brand-text outline-none placeholder:text-brand-muted"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedRoadId(null);
                  }}
                  className="text-brand-muted hover:text-brand-text"
                >
                  ×
                </button>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {[
                ['ALL', 'All'],
                ['CRITICAL', 'Critical'],
                ['HIGH', 'High'],
                ['MODERATE', 'Moderate'],
                ['LOW', 'Low'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setRiskFilter(value as 'ALL' | RiskLevel)}
                  className={`rounded-md px-2 py-1 text-[8px] font-medium transition ${
                    riskFilter === value
                      ? 'bg-primary text-white'
                      : 'bg-brand-dark text-brand-muted hover:text-brand-text border border-brand-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MAP LAYERS TOGGLE (HEATMAP + MARKERS) */}
        <div className="absolute bottom-5 left-4 z-[1000] w-[190px] rounded-xl border border-brand-border bg-brand-surface/95 p-3 shadow-xl backdrop-blur-xl">
          <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
            Map Layers
          </p>

          <label className="mb-2 flex cursor-pointer items-center justify-between">
            <span className="flex items-center gap-2 text-[10px] text-brand-text">
              <Flame size={12} className="text-orange-500" />
              Risk Heatmap
            </span>
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={() => setShowHeatmap(!showHeatmap)}
              className="accent-orange-500"
            />
          </label>

          <label className="mb-2 flex cursor-pointer items-center justify-between">
            <span className="flex items-center gap-2 text-[10px] text-brand-text">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Crimes ({crimes.length})
            </span>
            <input
              type="checkbox"
              checked={showCrimes}
              onChange={() => setShowCrimes(!showCrimes)}
              className="accent-red-500"
            />
          </label>

          <label className="mb-2 flex cursor-pointer items-center justify-between">
            <span className="flex items-center gap-2 text-[10px] text-brand-text">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              Lights ({streetlights.length})
            </span>
            <input
              type="checkbox"
              checked={showLights}
              onChange={() => setShowLights(!showLights)}
              className="accent-yellow-400"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between">
            <span className="flex items-center gap-2 text-[10px] text-brand-text">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              Reports ({reports.length})
            </span>
            <input
              type="checkbox"
              checked={showReports}
              onChange={() => setShowReports(!showReports)}
              className="accent-purple-400"
            />
          </label>
        </div>

        {/* MAP LEGEND */}
        <div className="absolute bottom-5 right-4 z-[1000] rounded-xl border border-brand-border bg-brand-surface/95 p-3 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <Shield size={12} className="text-primary" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
              Risk Intensity
            </p>
          </div>

          <div className="space-y-1.5">
            {[
              ['Critical (80–100)', '#ef4444'],
              ['High (60–79)', '#f97316'],
              ['Moderate (30–59)', '#eab308'],
              ['Low (0–29)', '#22c55e'],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2 text-[9px] text-brand-muted">
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
        </div>
      </div>
    </div>
  );
}