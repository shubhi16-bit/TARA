import { useEffect } from 'react';
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
import type { Road, CommunityReport } from '../services/taraDataService';

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

    case 'camera':
      return (
        <svg {...common}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
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

function getRelativeTime(timestamp: any): string {
  if (!timestamp) return 'Just now';
  let date: Date;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    return 'Just now';
  }

  const diffMs = Date.now() - date.getTime();
  if (isNaN(diffMs) || diffMs < 30000) return 'Just now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function getReportStatusStyle(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'resolved') {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }
  if (s === 'inrepair' || s === 'in_repair' || s === 'inreview' || s === 'in review' || s === 'verified') {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }
  return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
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

  const mapSpots = roads.map((r, idx) => {
    let pos: [number, number] = [28.6139 + idx * 0.003, 77.2090 + idx * 0.003];
    if (r.coordinates && r.coordinates.length > 0) {
      const p = r.coordinates[0];
      if (Array.isArray(p)) {
        pos = [p[0], p[1]];
      } else if (typeof p === 'object' && p !== null) {
        pos = [(p as any).lat || (p as any).latitude || pos[0], (p as any).lng || (p as any).longitude || pos[1]];
      }
    }
    return {
      id: r.id,
      name: r.name,
      pos,
      score: r.score,
      riskLevel: r.riskLevel,
      color: getRiskHex(r.score),
      faultyLights: r.faultyLights || 0,
      totalLights: r.totalLights || 10,
      reports: r.reports || 0,
    };
  });

  return (
    <section className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface xl:col-span-3 flex flex-col">
      <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-brand-text">
            Active Safety Radar
          </h3>
          <p className="mt-0.5 text-[11px] text-brand-muted">
            Live road risk coordinates across {city || 'monitored sector'}
          </p>
        </div>

        <span className="rounded-md border border-brand-border bg-brand-dark px-2.5 py-1 text-[10px] text-brand-muted">
          {roads.length} Monitored Roads
        </span>
      </div>

      <div className="relative h-[290px] w-full bg-brand-dark">
        <MapContainer
          center={centerPos}
          zoom={13}
          zoomControl={false}
          className="h-full w-full"
        >
          <ZoomControl position="bottomright" />
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {mapSpots.map((spot) => (
            <Circle
              key={`circle-${spot.id}`}
              center={spot.pos}
              radius={240}
              pathOptions={{
                color: spot.color,
                fillColor: spot.color,
                fillOpacity: spot.score >= 80 ? 0.25 : 0.12,
                weight: 1.5,
              }}
            />
          ))}

          {mapSpots.map((spot) => (
            <Marker
              key={`marker-${spot.id}`}
              position={spot.pos}
              icon={L.divIcon({
                className: 'custom-dashboard-marker',
                html: `
                  <div style="
                    background: ${spot.color};
                    color: white;
                    font-size: 10px;
                    font-weight: 700;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  ">
                    ${spot.score}
                  </div>
                `,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
              })}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold">{spot.name}</p>
                  <p className="mt-0.5 font-semibold" style={{ color: spot.color }}>
                    {spot.riskLevel} Risk ({spot.score}/100)
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {spot.faultyLights}/{spot.totalLights} lights down • {spot.reports} reports
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { roads, crimes, streetlights, reports, loading, city, profileError } = useTaraData();

  // Aggregate Metrics
  const totalLights = streetlights.length > 0
    ? streetlights.length
    : roads.reduce((sum, r) => sum + (r.totalLights || 10), 0);

  const faultyLights = streetlights.filter((l) => l.status === 'faulty' || l.status === 'broken').length > 0
    ? streetlights.filter((l) => l.status === 'faulty' || l.status === 'broken').length
    : roads.reduce((sum, r) => sum + (r.faultyLights || 0), 0);

  const criticalZones = roads.filter((r) => r.score >= 80).length;
  const pendingReports = reports.filter((r) => r.status === 'OPEN' || r.status === 'logged').length;
  const activeCrimes = crimes.length;

  // 1. Action Priority: Sorted strictly by calculated risk score DESC
  const topPriority = [...roads].sort((a, b) => b.score - a.score).slice(0, 4);

  // 2. Recent Citizen Reports: Sorted strictly by createdAt DESC (newest first)
  const sortedRecentReports = [...reports].sort((a, b) => {
    const getTime = (val: any) => {
      if (!val) return 0;
      if (typeof val.toDate === 'function') return val.toDate().getTime();
      if (val instanceof Date) return val.getTime();
      const t = new Date(val).getTime();
      return isNaN(t) ? 0 : t;
    };
    const timeA = getTime(a.createdAt) || getTime(a.timestamp);
    const timeB = getTime(b.createdAt) || getTime(b.timestamp);
    return timeB - timeA;
  });

  const recentCitizenReports = sortedRecentReports.slice(0, 5);

  // Development Debug Verification Logging
  useEffect(() => {
    if (reports.length > 0) {
      console.log('[TARA] Recent reports: [newest -> oldest]', sortedRecentReports.map((r) => r.id));
      const newest = sortedRecentReports[0];
      console.log('[TARA] Newest report ID:', newest?.id, 'createdAt:', newest?.createdAt || newest?.timestamp);
    }
  }, [reports]);

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
        {/* TOP REPAIR PRIORITIES (SORTED BY RISK SCORE DESC) */}
        <section className="xl:col-span-3 overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
          <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-brand-text">
                Top Repair Priorities
              </h3>
              <p className="mt-0.5 text-[11px] text-brand-muted">
                Roads ranked by calculated risk score descending
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
                          Low night footfall
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

        {/* RECENT CITIZEN REPORTS (SORTED BY CREATEDAT DESC) */}
        <section className="xl:col-span-2 overflow-hidden rounded-xl border border-brand-border bg-brand-surface flex flex-col">
          <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-brand-text">
                  Recent Citizen Reports
                </h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Live
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-brand-muted">
                Newest community reports sorted by submission time
              </p>
            </div>

            <button
              onClick={() => navigate('/map')}
              className="rounded-lg border border-brand-border px-2.5 py-1 text-xs font-medium text-brand-muted hover:text-brand-text hover:bg-brand-border/20 transition"
            >
              Map View
            </button>
          </div>

          <div className="divide-y divide-brand-border overflow-y-auto max-h-[380px] flex-1">
            {loading ? (
              <div className="p-8 text-center text-sm text-brand-muted">
                Loading recent reports...
              </div>
            ) : recentCitizenReports.length > 0 ? (
              recentCitizenReports.map((report: CommunityReport) => {
                const hasPhoto = (report.photoUrls && report.photoUrls.length > 0) || Boolean(report.imageUrl);
                const displayPhoto = report.imageUrl || (report.photoUrls && report.photoUrls[0]);
                const locLabel = report.road
                  ? `${report.road}${report.location && !report.location.includes(report.road) ? ` (${report.location})` : ''}`
                  : (report.location || report.city || 'Pinned Location');

                return (
                  <div
                    key={report.id}
                    className="flex items-start gap-3.5 px-5 py-3.5 transition hover:bg-brand-border/20"
                  >
                    {/* Left Icon or Thumbnail */}
                    {hasPhoto && displayPhoto ? (
                      <div className="relative mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-brand-border bg-brand-dark">
                        <img
                          src={displayPhoto}
                          alt="Report attachment"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 p-0.5 text-white">
                          <Icon type="camera" size={10} />
                        </span>
                      </div>
                    ) : (
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <Icon type="report" size={18} />
                      </div>
                    )}

                    {/* Report Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-brand-text">
                          {report.issueType || report.type || 'Infrastructure Report'}
                        </p>
                        <span className="shrink-0 text-[10px] font-medium text-brand-muted">
                          {getRelativeTime(report.createdAt || report.timestamp)}
                        </span>
                      </div>

                      <p className="mt-0.5 truncate text-[11px] text-brand-muted">
                        📍 {locLabel}
                      </p>

                      {(report.notes || report.desc) && (
                        <p className="mt-1 line-clamp-1 text-[11px] text-brand-text/80 italic">
                          "{report.notes || report.desc}"
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {/* Status badge */}
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase ${getReportStatusStyle(
                            report.status
                          )}`}
                        >
                          {report.status || 'LOGGED'}
                        </span>

                        {/* Lights down count */}
                        <span className="rounded bg-brand-dark border border-brand-border px-1.5 py-0.5 text-[9px] text-risk-mod font-mono">
                          {report.lightsDown || 1} light{(report.lightsDown || 1) > 1 ? 's' : ''} down
                        </span>

                        {/* Photo indicator badge if available */}
                        {hasPhoto && (
                          <span className="rounded bg-brand-dark border border-brand-border px-1.5 py-0.5 text-[9px] text-brand-muted flex items-center gap-1">
                            <Icon type="camera" size={10} /> Photo attached
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-sm text-brand-muted">
                No citizen reports yet
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