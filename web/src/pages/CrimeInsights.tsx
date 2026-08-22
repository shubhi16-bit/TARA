import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaraData } from '../hooks/useTaraData';
import { Shield, AlertTriangle, Lightbulb, FileText, TrendingUp, Filter } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

function getRiskColor(score: number) {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 30) return '#eab308';
  return '#22c55e';
}

function getSeverityBadge(severity: string) {
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

export default function Analytics() {
  const navigate = useNavigate();
  const { roads, crimes, streetlights, reports, riskSnapshots, loading, city, profileError } = useTaraData();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // 1. Risk distribution
  const criticalRoads = roads.filter((r) => r.score >= 80);
  const highRoads = roads.filter((r) => r.score >= 60 && r.score < 80);
  const modRoads = roads.filter((r) => r.score >= 30 && r.score < 60);
  const lowRoads = roads.filter((r) => r.score < 30);
  const totalRoads = roads.length;

  const criticalPct = totalRoads > 0 ? Math.round((criticalRoads.length / totalRoads) * 100) : 0;
  const highPct = totalRoads > 0 ? Math.round((highRoads.length / totalRoads) * 100) : 0;
  const modPct = totalRoads > 0 ? Math.round((modRoads.length / totalRoads) * 100) : 0;
  const lowPct = totalRoads > 0 ? Math.round((lowRoads.length / totalRoads) * 100) : 0;

  // 2. Crime type distribution
  const crimesByType = crimes.reduce<Record<string, number>>((acc, crime) => {
    const t = crime.type || 'Other';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const totalCrimes = crimes.length;
  const crimeTypesList = Object.entries(crimesByType).map(([type, count]) => ({
    type,
    count,
    pct: totalCrimes > 0 ? Math.round((count / totalCrimes) * 100) : 0,
  }));

  const filteredCrimes = selectedCategory === 'ALL'
    ? crimes
    : crimes.filter((c) => (c.type || 'Other').toLowerCase() === selectedCategory.toLowerCase());

  // 3. Streetlight fleet status (Faulty vs Operational)
  const workingLights = streetlights.filter((l) => l.status === 'working' || l.status === 'operational').length;
  const faultyLights = streetlights.filter((l) => l.status === 'faulty' || l.status === 'broken').length;
  const underRepair = streetlights.filter((l) => l.status === 'repair_dispatched' || l.status === 'under_repair').length;
  const totalLights = streetlights.length;

  // 4. Community reports by status
  const openReports = reports.filter((r) => r.status === 'OPEN').length;
  const verifiedReports = reports.filter((r) => r.status === 'VERIFIED').length;
  const resolvedReports = reports.filter((r) => r.status === 'RESOLVED').length;
  const totalReports = reports.length;

  // 5. Highest-risk roads (sorted descending by deterministic risk score)
  const highestRiskRoads = [...roads].sort((a, b) => b.score - a.score).slice(0, 5);

  // 6. City safety score
  const citySafetyScore = totalRoads > 0
    ? Math.round(100 - roads.reduce((sum, r) => sum + r.score, 0) / totalRoads)
    : 100;

  // 7. Risk trend from riskSnapshots
  const hasHistoricalTrend = riskSnapshots && riskSnapshots.length >= 2;
  const trendData = (riskSnapshots || []).map((s, i) => ({
    name: s.timeLabel || s.date || `Point ${i + 1}`,
    score: s.overallScore || s.avgRiskScore || 0,
  }));

  return (
    <div className="p-8 max-w-7xl">
      {profileError && (
        <div className="mb-6 rounded-lg border border-risk-crit/30 bg-risk-crit/10 p-4 text-risk-crit text-sm">
          <p className="font-semibold">Authority Setup Note:</p>
          <p className="mt-1">{profileError}</p>
        </div>
      )}

      {/* HEADER */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-brand-text">Safety & Risk Analytics — {city || 'Authority Command'}</h2>
          <p className="text-brand-muted mt-1 text-sm">
            Live aggregated metrics, infrastructure distribution, and deterministic risk modeling from Firestore.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg border border-brand-border bg-brand-surface text-xs font-semibold text-brand-text flex items-center gap-2 shadow-sm">
            <Shield size={15} className="text-primary" />
            <span>City Safety Score: {citySafetyScore}/100</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs text-green-500 font-medium">
            <span className="h-2 w-2 animate-pulse bg-green-500 rounded-full" />
            Live Sync
          </div>
        </div>
      </header>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-brand-surface border border-brand-border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-risk-crit mb-2">
            <AlertTriangle size={18} />
            <span className="text-xs font-semibold uppercase text-brand-muted">Critical Zones</span>
          </div>
          <p className="text-2xl font-bold text-brand-text">{criticalRoads.length}</p>
          <p className="text-[11px] text-brand-muted mt-1">{totalRoads} total monitored roads</p>
        </div>

        <div className="p-4 bg-brand-surface border border-brand-border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-risk-mod mb-2">
            <Lightbulb size={18} />
            <span className="text-xs font-semibold uppercase text-brand-muted">Faulty Lights</span>
          </div>
          <p className="text-2xl font-bold text-brand-text">{faultyLights}</p>
          <p className="text-[11px] text-brand-muted mt-1">{totalLights} total monitored lights</p>
        </div>

        <div className="p-4 bg-brand-surface border border-brand-border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-primary mb-2">
            <FileText size={18} />
            <span className="text-xs font-semibold uppercase text-brand-muted">Open Reports</span>
          </div>
          <p className="text-2xl font-bold text-brand-text">{openReports}</p>
          <p className="text-[11px] text-brand-muted mt-1">{totalReports} total citizen reports</p>
        </div>

        <div className="p-4 bg-brand-surface border border-brand-border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-risk-high mb-2">
            <AlertTriangle size={18} />
            <span className="text-xs font-semibold uppercase text-brand-muted">Active Crimes</span>
          </div>
          <p className="text-2xl font-bold text-brand-text">{totalCrimes}</p>
          <p className="text-[11px] text-brand-muted mt-1">Incident records in {city || 'region'}</p>
        </div>
      </div>

      {/* ROW 1: 1. RISK DISTRIBUTION & 2. CRIME TYPE DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 1. RISK DISTRIBUTION */}
        <div className="bg-brand-surface rounded-xl border border-brand-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider mb-4">
            1. Road Risk Distribution ({totalRoads} Segments)
          </h3>
          {totalRoads > 0 ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-risk-crit font-medium">Critical Risk (80–100)</span>
                  <span className="text-brand-muted font-mono">{criticalRoads.length} ({criticalPct}%)</span>
                </div>
                <div className="w-full bg-brand-dark rounded h-2 border border-brand-border overflow-hidden">
                  <div className="bg-risk-crit h-full rounded transition-all duration-500" style={{ width: `${criticalPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-risk-high font-medium">High Risk (60–79)</span>
                  <span className="text-brand-muted font-mono">{highRoads.length} ({highPct}%)</span>
                </div>
                <div className="w-full bg-brand-dark rounded h-2 border border-brand-border overflow-hidden">
                  <div className="bg-risk-high h-full rounded transition-all duration-500" style={{ width: `${highPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-risk-mod font-medium">Moderate Risk (30–59)</span>
                  <span className="text-brand-muted font-mono">{modRoads.length} ({modPct}%)</span>
                </div>
                <div className="w-full bg-brand-dark rounded h-2 border border-brand-border overflow-hidden">
                  <div className="bg-risk-mod h-full rounded transition-all duration-500" style={{ width: `${modPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-risk-low font-medium">Low Risk (0–29)</span>
                  <span className="text-brand-muted font-mono">{lowRoads.length} ({lowPct}%)</span>
                </div>
                <div className="w-full bg-brand-dark rounded h-2 border border-brand-border overflow-hidden">
                  <div className="bg-risk-low h-full rounded transition-all duration-500" style={{ width: `${lowPct}%` }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-brand-muted">
              {loading ? 'Loading risk distribution...' : `No road safety records logged for ${city || 'this city'}.`}
            </div>
          )}
        </div>

        {/* 2. CRIME TYPE DISTRIBUTION */}
        <div className="bg-brand-surface rounded-xl border border-brand-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider">
              2. Incident Categories ({totalCrimes})
            </h3>
            {crimeTypesList.length > 0 && (
              <div className="flex items-center gap-1">
                <Filter size={12} className="text-brand-muted" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-brand-dark border border-brand-border rounded px-2 py-1 text-xs text-brand-text outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {crimeTypesList.map((c) => (
                    <option key={c.type} value={c.type}>{c.type}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {crimeTypesList.length > 0 ? (
            <div className="space-y-3">
              {crimeTypesList.map((item) => (
                <div key={item.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-brand-text font-medium">{item.type}</span>
                    <span className="text-brand-muted font-mono">{item.count} incident{item.count > 1 ? 's' : ''} ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-brand-dark rounded h-2 border border-brand-border overflow-hidden">
                    <div className="bg-primary h-full rounded transition-all duration-500" style={{ width: `${item.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-brand-muted">
              {loading ? 'Loading crime types...' : `No crime records logged for ${city || 'this city'}.`}
            </div>
          )}
        </div>
      </div>

      {/* ROW 2: 3. FAULTY VS OPERATIONAL LIGHTS & 4. COMMUNITY REPORTS BY STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 3. STREETLIGHTS: FAULTY VS OPERATIONAL */}
        <div className="bg-brand-surface rounded-xl border border-brand-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider mb-4">
            3. Streetlight Fleet Status ({totalLights} Monitored)
          </h3>

          <div className="grid grid-cols-3 gap-3 text-center mb-5">
            <div className="p-3 bg-brand-dark/40 rounded-lg border border-brand-border">
              <p className="text-2xl font-bold text-risk-low">{workingLights}</p>
              <p className="text-xs text-brand-muted mt-1">Operational</p>
            </div>
            <div className="p-3 bg-brand-dark/40 rounded-lg border border-brand-border">
              <p className="text-2xl font-bold text-risk-mod">{faultyLights}</p>
              <p className="text-xs text-brand-muted mt-1">Faulty / Broken</p>
            </div>
            <div className="p-3 bg-brand-dark/40 rounded-lg border border-brand-border">
              <p className="text-2xl font-bold text-primary">{underRepair}</p>
              <p className="text-xs text-brand-muted mt-1">Under Repair</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-brand-muted mb-1.5 font-medium">
              <span>Fleet Operational Ratio</span>
              <span>{totalLights > 0 ? Math.round((workingLights / totalLights) * 100) : 100}% Healthy</span>
            </div>
            <div className="w-full bg-brand-dark rounded-full h-2.5 border border-brand-border flex overflow-hidden">
              <div
                className="bg-risk-low h-full"
                style={{ width: `${totalLights > 0 ? (workingLights / totalLights) * 100 : 100}%` }}
              />
              <div
                className="bg-risk-mod h-full"
                style={{ width: `${totalLights > 0 ? (faultyLights / totalLights) * 100 : 0}%` }}
              />
              <div
                className="bg-primary h-full"
                style={{ width: `${totalLights > 0 ? (underRepair / totalLights) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4. COMMUNITY REPORTS BY STATUS */}
        <div className="bg-brand-surface rounded-xl border border-brand-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider mb-4">
            4. Citizen Community Reports ({totalReports} Total)
          </h3>

          <div className="grid grid-cols-3 gap-3 text-center mb-5">
            <div className="p-3 bg-brand-dark/40 rounded-lg border border-brand-border">
              <p className="text-2xl font-bold text-risk-mod">{openReports}</p>
              <p className="text-xs text-brand-muted mt-1">Pending (OPEN)</p>
            </div>
            <div className="p-3 bg-brand-dark/40 rounded-lg border border-brand-border">
              <p className="text-2xl font-bold text-primary">{verifiedReports}</p>
              <p className="text-xs text-brand-muted mt-1">VERIFIED</p>
            </div>
            <div className="p-3 bg-brand-dark/40 rounded-lg border border-brand-border">
              <p className="text-2xl font-bold text-risk-low">{resolvedReports}</p>
              <p className="text-xs text-brand-muted mt-1">RESOLVED</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-brand-muted">
              <span>Resolution Progress</span>
              <span>{totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0}% Closed</span>
            </div>
            <div className="w-full bg-brand-dark rounded-full h-2.5 border border-brand-border flex overflow-hidden">
              <div
                className="bg-risk-low h-full"
                style={{ width: `${totalReports > 0 ? (resolvedReports / totalReports) * 100 : 0}%` }}
              />
              <div
                className="bg-primary h-full"
                style={{ width: `${totalReports > 0 ? (verifiedReports / totalReports) * 100 : 0}%` }}
              />
              <div
                className="bg-risk-mod h-full"
                style={{ width: `${totalReports > 0 ? (openReports / totalReports) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: 5. HIGHEST-RISK ROADS */}
      <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden shadow-sm mb-6">
        <div className="p-5 border-b border-brand-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider">
              5. Highest-Risk Road Segments
            </h3>
            <p className="text-xs text-brand-muted mt-0.5">Prioritized by the deterministic TARA risk engine</p>
          </div>
          <button
            onClick={() => navigate('/priority')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View All in Action Priority →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-brand-text">
            <thead className="border-b border-brand-border bg-brand-dark/50 text-xs uppercase text-brand-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Rank</th>
                <th className="px-5 py-3 font-medium">Road Segment</th>
                <th className="px-5 py-3 font-medium">Risk Score</th>
                <th className="px-5 py-3 font-medium">Risk Level</th>
                <th className="px-5 py-3 font-medium">Faulty Lights</th>
                <th className="px-5 py-3 font-medium">Incidents</th>
                <th className="px-5 py-3 font-medium">Reports</th>
                <th className="px-5 py-3 font-medium">Night Exposure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {highestRiskRoads.length > 0 ? (
                highestRiskRoads.map((road, idx) => (
                  <tr
                    key={road.id}
                    className="hover:bg-brand-border/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/map?search=${encodeURIComponent(road.name)}`)}
                  >
                    <td className="px-5 py-3.5 font-bold text-brand-text">#{idx + 1}</td>
                    <td className="px-5 py-3.5 font-medium text-brand-text">{road.name}</td>
                    <td className="px-5 py-3.5 font-bold font-mono" style={{ color: getRiskColor(road.score) }}>
                      {road.score}/100
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold border"
                        style={{
                          color: getRiskColor(road.score),
                          borderColor: `${getRiskColor(road.score)}40`,
                          backgroundColor: `${getRiskColor(road.score)}15`,
                        }}
                      >
                        {road.riskLevel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-brand-muted text-xs">
                      {road.faultyLights} / {road.totalLights || 10}
                    </td>
                    <td className="px-5 py-3.5 text-brand-muted text-xs">{road.crimeNearby}</td>
                    <td className="px-5 py-3.5 text-brand-muted text-xs">{road.reports}</td>
                    <td className="px-5 py-3.5 text-brand-muted text-xs font-mono">{road.nightExposure}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-brand-muted">
                    {loading ? 'Loading road records...' : `No road safety records logged for ${city || 'this city'}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROW 4: 6. RISK TREND (IF RISKSNAPSHOTS EXISTS) */}
      <div className="bg-brand-surface rounded-xl border border-brand-border p-5 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider">
            6. Historical Safety Risk Trend
          </h3>
        </div>

        {hasHistoricalTrend ? (
          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                <XAxis dataKey="name" stroke="var(--brand-muted)" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="var(--brand-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--brand-surface)',
                    borderColor: 'var(--brand-border)',
                    borderRadius: '8px',
                    color: 'var(--brand-text)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--primary)', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-10 text-center rounded-lg border border-brand-border bg-brand-dark/30">
            <p className="text-sm font-medium text-brand-muted">No historical data available yet</p>
            <p className="text-xs text-brand-muted mt-1">
              Historical trends will automatically plot as daily risk snapshots are recorded for {city || 'this region'}.
            </p>
          </div>
        )}
      </div>

      {/* DETAILED INCIDENT LOG TABLE */}
      <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-brand-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wider">
            Filtered Incident Log ({filteredCrimes.length})
          </h3>
          {selectedCategory !== 'ALL' && (
            <button
              onClick={() => setSelectedCategory('ALL')}
              className="text-xs text-primary hover:underline"
            >
              Reset filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-brand-text">
            <thead className="border-b border-brand-border bg-brand-dark/50 text-xs uppercase text-brand-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Location / Details</th>
                <th className="px-5 py-3 font-medium">Reported Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredCrimes.length > 0 ? (
                filteredCrimes.map((c) => (
                  <tr key={c.id} className="hover:bg-brand-border/20 transition-colors">
                    <td className="px-5 py-3 font-semibold text-brand-text">{c.type}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(c.severity)}`}>
                        {c.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-brand-muted text-xs">
                      {c.desc || (c.lat && c.lng ? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}` : city)}
                    </td>
                    <td className="px-5 py-3 text-brand-muted text-xs">{c.time}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-brand-muted">
                    {loading ? 'Loading incidents...' : `No incidents match category '${selectedCategory}'.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
