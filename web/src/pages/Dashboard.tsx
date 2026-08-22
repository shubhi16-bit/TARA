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

const mockStats = {
  totalStreetlights: 1284,
  faulty: 183,
  criticalZones: 24,
  pendingReports: 47,
  activeCrimes: 3,
};

const recentActivity = [
  {
    id: 1,
    type: 'crime',
    label: 'Theft reported',
    location: 'Inner Circle, CP',
    time: '10 mins ago',
    severity: 'HIGH',
  },
  {
    id: 2,
    type: 'report',
    label: 'Broken streetlight',
    location: 'Janpath',
    time: '35 mins ago',
    severity: 'MODERATE',
  },
  {
    id: 3,
    type: 'crime',
    label: 'Harassment reported',
    location: 'Janpath',
    time: '1 hour ago',
    severity: 'CRITICAL',
  },
  {
    id: 4,
    type: 'report',
    label: 'Dark area reported',
    location: 'Pragati Maidan',
    time: '2 hours ago',
    severity: 'MODERATE',
  },
  {
    id: 5,
    type: 'repair',
    label: 'Streetlight repaired',
    location: 'India Gate',
    time: '3 hours ago',
    severity: 'LOW',
  },
];

const topPriority = [
  {
    rank: 1,
    location: 'Inner Circle, CP',
    score: 91,
    reason: '3 faulty lights • Active theft reported nearby',
    tags: ['High footfall', 'Multiple reports'],
  },
  {
    rank: 2,
    location: 'Janpath',
    score: 78,
    reason: 'Dark zone • Harassment report',
    tags: ['High footfall', 'Recent crime'],
  },
  {
    rank: 3,
    location: 'Sansad Marg',
    score: 52,
    reason: '1 faulty light • Moderate footfall',
    tags: ['Medium footfall', 'Lighting issue'],
  },
];

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
  return 'text-risk-mod';
}

function getActivityIcon(type: string) {
  if (type === 'crime') return 'crime';
  if (type === 'repair') return 'repair';
  return 'report';
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

function RiskHeatmap() {
  const hotspots = [
    {
      id: 'cp',
      name: 'Connaught Place',
      position: [28.6315, 77.2190] as [number, number],
      score: 91,
      level: 'Very High',
      color: '#ef4444',
      radius: 900,
      reasons: 'Active theft + multiple faulty lights',
    },
    {
      id: 'janpath',
      name: 'Janpath',
      position: [28.6272, 77.2190] as [number, number],
      score: 78,
      level: 'High',
      color: '#f97316',
      radius: 750,
      reasons: 'Harassment report + dark zone',
    },
    {
      id: 'pragati',
      name: 'Pragati Maidan',
      position: [28.6208, 77.2470] as [number, number],
      score: 68,
      level: 'High',
      color: '#f97316',
      radius: 700,
      reasons: 'Recent reports + lower night safety',
    },
    {
      id: 'india-gate',
      name: 'India Gate',
      position: [28.6129, 77.2295] as [number, number],
      score: 52,
      level: 'Moderate',
      color: '#eab308',
      radius: 650,
      reasons: 'Faulty lighting + moderate footfall',
    },
    {
      id: 'karol-bagh',
      name: 'Karol Bagh',
      position: [28.6514, 77.1907] as [number, number],
      score: 42,
      level: 'Moderate',
      color: '#eab308',
      radius: 600,
      reasons: 'Moderate reports',
    },
    {
      id: 'lajpat',
      name: 'Lajpat Nagar',
      position: [28.5677, 77.2433] as [number, number],
      score: 24,
      level: 'Low',
      color: '#22c55e',
      radius: 550,
      reasons: 'Low incident activity',
    },
  ];

  /*
   * Small glowing marker used for the visual hotspot.
   */
  const createGlowIcon = (color: string) =>
    L.divIcon({
      className: '',
      html: `
        <div
          style="
            width: 18px;
            height: 18px;
            border-radius: 9999px;
            background: ${color};
            box-shadow:
              0 0 8px ${color},
              0 0 18px ${color},
              0 0 35px ${color},
              0 0 55px ${color};
            border: 2px solid rgba(255,255,255,0.55);
          "
        ></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

  return (
    <section className="relative h-[360px] overflow-hidden rounded-xl border border-brand-border bg-[#07101f] xl:col-span-3">

      {/* =====================================================
          MAP
      ===================================================== */}

      <MapContainer
        center={[28.625, 77.218]}
        zoom={12}
        zoomControl={false}
        attributionControl={false}
        style={{
          height: '100%',
          width: '100%',
          background: '#07101f',
        }}
      >

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <ZoomControl position="topright" />

        {/* -----------------------------------------------
            RISK AREAS
        ------------------------------------------------ */}

        {hotspots.map((spot) => (
          <Circle
            key={`area-${spot.id}`}
            center={spot.position}
            radius={spot.radius}
            pathOptions={{
              color: spot.color,
              fillColor: spot.color,
              fillOpacity:
                spot.score >= 80
                  ? 0.12
                  : spot.score >= 60
                  ? 0.09
                  : spot.score >= 30
                  ? 0.07
                  : 0.05,
              weight: 0,
              opacity: 0,
            }}
          />
        ))}

        {/* -----------------------------------------------
            GLOWING HOTSPOT MARKERS
        ------------------------------------------------ */}

        {hotspots.map((spot) => (
          <Marker
            key={spot.id}
            position={spot.position}
            icon={createGlowIcon(spot.color)}
          >
            <Popup>
              <div className="min-w-[180px] font-sans text-gray-900">

                <p className="text-sm font-semibold">
                  {spot.name}
                </p>

                <div className="mt-2 flex items-end gap-2">

                  <span
                    className="text-2xl font-bold"
                    style={{
                      color: spot.color,
                    }}
                  >
                    {spot.score}
                  </span>

                  <span className="mb-1 text-xs text-gray-500">
                    / 100
                  </span>

                </div>

                <p
                  className="mt-1 text-xs font-semibold"
                  style={{
                    color: spot.color,
                  }}
                >
                  {spot.level} Risk
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  {spot.reasons}
                </p>

              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>

      {/* =====================================================
          TITLE
      ===================================================== */}

      <div className="pointer-events-none absolute left-4 top-4 z-[500]">

        <h3 className="text-sm font-semibold text-white">
          Risk Heatmap
        </h3>

        <p className="mt-0.5 text-[11px] text-slate-400">
          City-wide safety risk visualization
        </p>

      </div>

      {/* =====================================================
          LEGEND
      ===================================================== */}

      <div className="absolute bottom-4 left-4 z-[500] rounded-xl border border-white/10 bg-[#0b1220]/90 p-3 shadow-xl backdrop-blur">

        <p className="mb-2 text-[10px] font-semibold text-white">
          Risk Level
        </p>

        <div className="space-y-2">

          {[
            ['Very High', '#ef4444'],
            ['High', '#f97316'],
            ['Moderate', '#eab308'],
            ['Low', '#22c55e'],
          ].map(([label, color]) => (
            <div
              key={label}
              className="flex items-center gap-2"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
              />

              <span className="text-[10px] text-slate-300">
                {label}
              </span>
            </div>
          ))}

        </div>

      </div>

      {/* =====================================================
          LIVE INDICATOR
      ===================================================== */}

      <div className="absolute right-14 top-4 z-[500] flex items-center gap-1.5 rounded-full border border-green-500/20 bg-black/40 px-2.5 py-1.5 backdrop-blur">

        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />

        <span className="text-[9px] font-medium text-green-400">
          LIVE
        </span>

      </div>

    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const city = localStorage.getItem('authCity') || 'Metropolis';

  return (
    <div className="min-h-full bg-brand-dark p-5 md:p-7">
      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">
            Overview — {city}
          </h2>

          <p className="mt-1 text-sm text-brand-muted">
            Real-time safety metrics, active incidents, and top priorities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-muted">
            Last updated just now
          </span>

          <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-3 py-1.5 text-xs text-green-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            System Online
          </div>
        </div>
      </header>

      {/* KPI CARDS */}
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard
          icon="light"
          label="Streetlights"
          value={mockStats.totalStreetlights.toLocaleString()}
          description="Total monitored"
          accent="text-primary"
          trend="↑ 18 repaired"
        />

        <KpiCard
          icon="warning"
          label="Faulty Lights"
          value={mockStats.faulty.toString()}
          description="Needs repair"
          accent="text-risk-mod"
          trend="↑ 11 today"
        />

        <KpiCard
          icon="shield"
          label="Critical Zones"
          value={mockStats.criticalZones.toString()}
          description="High-risk areas"
          accent="text-risk-crit"
          trend="↑ 4 today"
        />

        <KpiCard
          icon="report"
          label="Reports"
          value={mockStats.pendingReports.toString()}
          description="New today"
          accent="text-blue-400"
          trend="↓ 6 resolved"
        />

        <KpiCard
          icon="crime"
          label="Active Crimes"
          value={mockStats.activeCrimes.toString()}
          description="Live alerts"
          accent="text-risk-high"
          trend="View alerts →"
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
            {topPriority.map((item) => (
              <button
                key={item.rank}
                onClick={() => navigate('/priority')}
                className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.025]"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035] text-lg font-bold ${getPriorityColor(
                    item.score
                  )}`}
                >
                  #{item.rank}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-text">
                    {item.location}
                  </p>

                  <p className="mt-1 truncate text-xs text-brand-muted">
                    {item.reason}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-brand-dark px-2 py-0.5 text-[9px] text-brand-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="hidden w-28 text-right sm:block">
                  <p
                    className={`text-2xl font-bold ${getPriorityColor(
                      item.score
                    )}`}
                  >
                    {item.score}
                  </p>
                  <p className="text-[9px] font-medium uppercase tracking-wider text-brand-muted">
                    Risk Score
                  </p>

                  {/* mini sparkline */}
                  <svg
                    className="ml-auto mt-1 h-7 w-20"
                    viewBox="0 0 80 28"
                    fill="none"
                  >
                    <path
                      d={
                        item.rank === 1
                          ? 'M0 24 C8 24 8 5 16 5 C24 5 22 20 30 18 C38 16 38 11 45 16 C52 21 54 7 61 12 C68 18 72 8 80 10'
                          : item.rank === 2
                          ? 'M0 23 C8 23 10 8 17 8 C25 8 23 18 31 17 C40 16 40 10 47 14 C54 18 56 9 63 13 C70 17 74 9 80 11'
                          : 'M0 22 C8 22 10 13 17 13 C25 13 24 19 31 18 C39 17 40 12 47 16 C55 20 56 11 63 14 C70 18 74 12 80 13'
                      }
                      stroke="currentColor"
                      className={getPriorityColor(item.score)}
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </button>
            ))}
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
                Real-time updates from the city
              </p>
            </div>

            <button className="text-xs font-medium text-primary hover:underline">
              View All
            </button>
          </div>

          <div className="max-h-[365px] divide-y divide-brand-border overflow-y-auto">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-white/[0.025]"
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${getSeverityStyle(
                    item.severity
                  )}`}
                >
                  <Icon type={getActivityIcon(item.type)} size={17} />
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
            ))}
          </div>
        </section>
      </div>

      {/* LOWER GRID */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-5">
        <RiskHeatmap />

        {/* TODAY AT A TARA */}
        <section className="rounded-xl border border-brand-border bg-brand-surface p-5 xl:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-brand-text">
              Key city-wide indicators
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-brand-border bg-brand-dark/40 p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Icon type="people" size={17} />
              </div>
              <p className="text-[10px] text-brand-muted">Est. Night Footfall</p>
              <p className="mt-1 text-xl font-bold text-brand-text">18.6K</p>
              <p className="mt-1 text-[9px] text-risk-low">↑ 8% vs yesterday</p>
            </div>

            <div className="rounded-lg border border-brand-border bg-brand-dark/40 p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-400">
                <Icon type="shield" size={17} />
              </div>
              <p className="text-[10px] text-brand-muted">Avg. Safety Score</p>
              <p className="mt-1 text-xl font-bold text-brand-text">63/100</p>
              <p className="mt-1 text-[9px] text-risk-low">↑ 5 vs yesterday</p>
            </div>

            <div className="rounded-lg border border-brand-border bg-brand-dark/40 p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon type="report" size={17} />
              </div>
              <p className="text-[10px] text-brand-muted">Reports Received</p>
              <p className="mt-1 text-xl font-bold text-brand-text">47</p>
              <p className="mt-1 text-[9px] text-risk-low">↑ 12 vs yesterday</p>
            </div>

            <div className="rounded-lg border border-brand-border bg-brand-dark/40 p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                <Icon type="repair" size={17} />
              </div>
              <p className="text-[10px] text-brand-muted">Issues Resolved</p>
              <p className="mt-1 text-xl font-bold text-brand-text">6</p>
              <p className="mt-1 text-[9px] text-risk-low">↑ 2 vs yesterday</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}