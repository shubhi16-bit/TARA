import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTaraData } from '../hooks/useTaraData';
import type { Road } from '../services/taraDataService';

const cityCoordinates: Record<string, [number, number]> = {
  'New Delhi': [28.6315, 77.2190],
  'Mumbai': [19.0760, 72.8777],
  'Metropolis': [28.6315, 77.2190],
};

function Icon({
  type,
  size = 18,
}: {
  type: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (type) {
    case 'light':
      return (
        <svg {...common}>
          <path d="M9 21h6" />
          <path d="M10 17h4" />
          <path d="M12 3v2" />
          <path d="M4.9 5.9l1.4 1.4" />
          <path d="M19.1 5.9l-1.4 1.4" />
          <path d="M4 12h2" />
          <path d="M18 12h2" />
          <path d="M7.8 15.2A6 6 0 1 1 16.2 15.2" />
        </svg>
      );

    case 'warning':
      return (
        <svg {...common}>
          <path d="M12 3 2.8 20h18.4L12 3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );

    case 'report':
      return (
        <svg {...common}>
          <path d="M6 3h12v18H6z" />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
          <path d="M9 15h4" />
        </svg>
      );

    case 'crime':
      return (
        <svg {...common}>
          <path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      );

    case 'repair':
      return (
        <svg {...common}>
          <path d="m14.7 6.3 3 3" />
          <path d="m4 20 6.7-6.7" />
          <path d="M14 5a4 4 0 0 0 5 5l-8.8 8.8a2.1 2.1 0 0 1-3-3L16 7a4 4 0 0 0-2-2Z" />
        </svg>
      );

    case 'people':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M16 14a5 5 0 0 1 5 5" />
        </svg>
      );

    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case 'activity':
      return (
        <svg {...common}>
          <path d="M3 12h4l2-7 4 14 2-7h6" />
        </svg>
      );

    default:
      return <span />;
  }
}

function getSeverityStyle(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return 'text-risk-crit bg-risk-crit/10 border-risk-crit/20';
    case 'HIGH':
      return 'text-risk-high bg-risk-high/10 border-risk-high/20';
    case 'MODERATE':
      return 'text-risk-mod bg-risk-mod/10 border-risk-mod/20';
    default:
      return 'text-risk-low bg-risk-low/10 border-risk-low/20';
  }
}

function getPriorityColor(score: number) {
  if (score >= 80) return 'text-risk-crit';
  if (score >= 60) return 'text-risk-high';
  if (score >= 30) return 'text-risk-mod';
  return 'text-risk-low';
}

function getRiskHex(score: number) {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 30) return '#eab308';
  return '#22c55e';
}

function KpiCard({
  icon,
  label,
  value,
  description,
  accent,
  trend,
}: {
  icon: string;
  label: string;
  value: string;
  description: string;
  accent: string;
  trend?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-brand-border bg-brand-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40">
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${accent} opacity-[0.06] blur-2xl`}
      />

      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent} bg-opacity-10`}
        >
          <span className={accent}>
            <Icon type={icon} size={20} />
          </span>
        </div>

        {trend && (
          <span className="text-[10px] font-medium text-risk-low">
            {trend}
          </span>
        )}
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-brand-muted">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-brand-text">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-brand-muted">{description}</p>
    </div>
  );
}

function DashboardMap({ roads, city }: { roads: Road[]; city: string }) {
  const centerPos = cityCoordinates[city] || [28.6315, 77.2190];

  const createGlowIcon = (color: string) =>
    L.divIcon({
      className: '',
      html: `
        <div
          style="
            width: 16px;
            height: 16px;
            border-radius: 9999px;
            background: ${color};
            box-shadow: 0 0 8px ${color}, 0 0 16px ${color};
            border: 2px solid rgba(255,255,255,0.7);
          "
        ></div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

  const spots = roads
    .filter((r) => r.coordinates && r.coordinates.length > 0)
    .map((r) => ({
      id: r.id,
      name: r.name,
      position: r.coordinates[0] as [number, number],
      score: r.score,
      level: r.riskLevel,
      color: getRiskHex(r.score),
      reasons: `${r.faultyLights} faulty lights • ${r.crimeNearby} crimes`,
    }));

  return (
    <section className="relative h-[360px] overflow-hidden rounded-xl border border-brand-border bg-brand-surface xl:col-span-3">
      <MapContainer
        key={city}
        center={spots.length > 0 ? spots[0].position : centerPos}
        zoom={13}
        zoomControl={false}
        attributionControl={false}
        style={{
          height: '100%',
          width: '100%',
          background: 'var(--brand-dark)',
        }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="topright" />

        {spots.map((spot) => (
          <Circle
            key={`area-${spot.id}`}
            center={spot.position}
            radius={700}
            pathOptions={{
              color: spot.color,
              fillColor: spot.color,
              fillOpacity: spot.score >= 80 ? 0.18 : 0.09,
              weight: 1,
            }}
          />
        ))}

        {spots.map((spot) => (
          <Marker
            key={spot.id}
            position={spot.position}
            icon={createGlowIcon(spot.color)}
          >
            <Popup>
              <div className="min-w-[170px] font-sans text-gray-900">
                <p className="text-sm font-semibold">{spot.name}</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-xl font-bold" style={{ color: spot.color }}>
                    {spot.score}
                  </span>
                  <span className="mb-0.5 text-xs text-gray-500">/ 100</span>
                </div>
                <p className="mt-1 text-xs font-semibold" style={{ color: spot.color }}>
                  {spot.level} Risk
                </p>
                <p className="mt-1 text-xs text-gray-500">{spot.reasons}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-md bg-brand-surface/90 px-3 py-1.5 backdrop-blur border border-brand-border shadow-sm">
        <h3 className="text-xs font-semibold text-brand-text">Risk Heatmap</h3>
        <p className="text-[10px] text-brand-muted">City-wide safety risk visualization</p>
      </div>

      <div className="absolute bottom-4 left-4 z-[500] rounded-xl border border-brand-border bg-brand-surface/95 p-3 shadow-xl backdrop-blur">
        <p className="mb-2 text-[10px] font-semibold text-brand-text">Risk Level</p>
        <div className="space-y-1.5">
          {[
            ['Critical', '#ef4444'],
            ['High', '#f97316'],
            ['Moderate', '#eab308'],
            ['Low', '#22c55e'],
          ].map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
              />
              <span className="text-[10px] text-brand-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-14 top-4 z-[500] flex items-center gap-1.5 rounded-full border border-green-500/20 bg-brand-surface/90 px-2.5 py-1 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
        <span className="text-[9px] font-semibold text-green-500">LIVE SYNC</span>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    roads,
    crimes,
    streetlights,
    reports,
    loading,
    city,
    profileError,
  } = useTaraData();

  // Compute live KPIs
  const totalLights = streetlights.length > 0
    ? streetlights.length
    : roads.reduce((sum, r) => sum + (r.totalLights || 0), 0);

  const faultyLights = streetlights.filter((l) => l.status === 'faulty' || l.status === 'broken').length > 0
    ? streetlights.filter((l) => l.status === 'faulty' || l.status === 'broken').length
    : roads.reduce((sum, r) => sum + (r.faultyLights || 0), 0);

  const criticalZones = roads.filter((r) => r.score >= 80).length;
  const pendingReports = reports.filter((r) => r.status === 'OPEN').length;
  const activeCrimes = crimes.length;

  // Sorted priorities
  const topPriority = [...roads].sort((a, b) => b.score - a.score).slice(0, 4);

  // Combined live activity feed
  const recentActivity = [
    ...crimes.map((c) => ({
      id: `c-${c.id}`,
      type: 'crime',
      label: `${c.type} reported`,
      location: c.desc || (c.lat != null && c.lng != null ? `${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}` : (c.district || city)),
      time: c.time,
      severity: c.severity,
    })),
    ...reports.map((r) => ({
      id: `r-${r.id}`,
      type: 'report',
      label: r.type,
      location: r.desc || city,
      time: r.time,
      severity: r.status === 'OPEN' ? 'MODERATE' : 'LOW',
    })),
    ...streetlights
      .filter((s) => s.status === 'repaired' || s.status === 'repair_dispatched')
      .map((s) => ({
        id: `s-${s.id}`,
        type: 'repair',
        label: s.status === 'repaired' ? 'Streetlight repaired' : 'Repair dispatched',
        location: s.road || city,
        time: 'Recent',
        severity: 'LOW',
      })),
  ].slice(0, 6);

  const avgSafetyScore = roads.length > 0
    ? Math.round(100 - roads.reduce((sum, r) => sum + r.score, 0) / roads.length)
    : 75;

  return (
    <div className="min-h-full bg-brand-dark p-5 md:p-7">
      {/* PROFILE ERROR BANNER IF DOCUMENT MISSING */}
      {profileError && (
        <div className="mb-6 rounded-lg border border-risk-crit/30 bg-risk-crit/10 p-4 text-risk-crit text-sm">
          <p className="font-semibold">Authority Setup Note:</p>
          <p className="mt-1">{profileError}</p>
        </div>
      )}

      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">
            Overview — {city || 'Authority Command'}
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            Real-time safety metrics, active incidents, and top priorities from Firestore.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-muted">
            {loading ? 'Syncing Firestore...' : 'Connected to Firestore'}
          </span>

          <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs text-green-500 font-medium">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            System Online
          </div>
        </div>
      </header>

      {/* KPI CARDS */}
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard
          icon="light"
          label="Streetlights"
          value={totalLights.toLocaleString()}
          description="Total monitored"
          accent="text-primary"
        />

        <KpiCard
          icon="warning"
          label="Faulty Lights"
          value={faultyLights.toString()}
          description="Needs repair"
          accent="text-risk-mod"
        />

        <KpiCard
          icon="shield"
          label="Critical Zones"
          value={criticalZones.toString()}
          description="High-risk segments"
          accent="text-risk-crit"
        />

        <KpiCard
          icon="report"
          label="Open Reports"
          value={pendingReports.toString()}
          description="Citizen reports"
          accent="text-primary"
        />

        <KpiCard
          icon="crime"
          label="Active Crimes"
          value={activeCrimes.toString()}
          description="Incident records"
          accent="text-risk-high"
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* PRIORITIES */}
        <section className="xl:col-span-3 overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
          <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-brand-text">
                Top Repair Priorities
              </h3>
              <p className="mt-0.5 text-[11px] text-brand-muted">
                Areas ranked by risk score and safety impact
              </p>
            </div>

            <button
              onClick={() => navigate('/priority')}
              className="rounded-lg border border-brand-border px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
            >
              View All →
            </button>
          </div>

          <div className="divide-y divide-brand-border">
            {topPriority.length > 0 ? (
              topPriority.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => navigate('/priority')}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-brand-border/20"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-dark text-lg font-bold ${getPriorityColor(
                      item.score
                    )}`}
                  >
                    #{idx + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-text">
                      {item.name}
                    </p>

                    <p className="mt-1 truncate text-xs text-brand-muted">
                      {item.faultyLights} faulty lights • {item.crimeNearby} nearby incidents • {item.reports} reports
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-brand-dark px-2 py-0.5 text-[9px] text-brand-muted border border-brand-border">
                        {item.riskLevel} RISK
                      </span>
                      {item.nightExposure < 40 && (
                        <span className="rounded-md bg-brand-dark px-2 py-0.5 text-[9px] text-brand-muted border border-brand-border">
                          Low night lighting
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden w-28 text-right sm:block">
                    <p className={`text-2xl font-bold ${getPriorityColor(item.score)}`}>
                      {item.score}
                    </p>
                    <p className="text-[9px] font-medium uppercase tracking-wider text-brand-muted">
                      Risk Score
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-brand-muted">
                {loading ? 'Loading road records...' : `No road safety records found for ${city || 'this city'}.`}
              </div>
            )}
          </div>
        </section>

        {/* ACTIVITY FEED */}
        <section className="xl:col-span-2 overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
          <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-brand-text">
                Live Activity Feed
              </h3>
              <p className="mt-0.5 text-[11px] text-brand-muted">
                Real-time updates from Firestore
              </p>
            </div>
          </div>

          <div className="max-h-[365px] divide-y divide-brand-border overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-brand-border/20"
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${getSeverityStyle(
                      item.severity
                    )}`}
                  >
                    <Icon type={item.type} size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[8px] font-bold tracking-wide ${getSeverityStyle(
                          item.severity
                        )}`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-[10px] text-brand-muted">
                        {item.time}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-semibold text-brand-text">
                      {item.label}
                    </p>

                    <p className="mt-0.5 text-[11px] text-brand-muted">
                      {item.location}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-brand-muted">
                {loading ? 'Loading activity...' : 'No incident activity recorded yet.'}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* LOWER GRID */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-5">
        <DashboardMap roads={roads} city={city} />

        {/* TODAY AT TARA */}
        <section className="rounded-xl border border-brand-border bg-brand-surface p-5 xl:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-brand-text">
              Key Safety Indicators
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-brand-border bg-brand-dark/40 p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Icon type="people" size={17} />
              </div>
              <p className="text-[10px] text-brand-muted">Monitored Roads</p>
              <p className="mt-1 text-xl font-bold text-brand-text">{roads.length}</p>
              <p className="mt-1 text-[9px] text-brand-muted">{city || 'City-wide'}</p>
            </div>

            <div className="rounded-lg border border-brand-border bg-brand-dark/40 p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
                <Icon type="shield" size={17} />
              </div>
              <p className="text-[10px] text-brand-muted">Avg. Safety Score</p>
              <p className="mt-1 text-xl font-bold text-brand-text">{avgSafetyScore}/100</p>
              <p className="mt-1 text-[9px] text-risk-low">Active Risk Engine</p>
            </div>

            <div className="rounded-lg border border-brand-border bg-brand-dark/40 p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon type="report" size={17} />
              </div>
              <p className="text-[10px] text-brand-muted">Total Reports</p>
              <p className="mt-1 text-xl font-bold text-brand-text">{reports.length}</p>
              <p className="mt-1 text-[9px] text-brand-muted">Community submitted</p>
            </div>

            <div className="rounded-lg border border-brand-border bg-brand-dark/40 p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                <Icon type="repair" size={17} />
              </div>
              <p className="text-[10px] text-brand-muted">Faulty Ratio</p>
              <p className="mt-1 text-xl font-bold text-brand-text">
                {totalLights > 0 ? `${Math.round((faultyLights / totalLights) * 100)}%` : '0%'}
              </p>
              <p className="mt-1 text-[9px] text-brand-muted">Infrastructure status</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}