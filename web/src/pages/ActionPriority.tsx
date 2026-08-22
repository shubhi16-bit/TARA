import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaraData } from '../hooks/useTaraData';
import type { RiskLevel } from '../services/taraDataService';
import { Calendar, X, Wrench, CheckCircle2 } from 'lucide-react';

type ActionType = 'repair' | 'inspect' | 'maintenance';

function getRiskText(risk: RiskLevel) {
  switch (risk) {
    case 'CRITICAL':
      return 'text-risk-crit';
    case 'HIGH':
      return 'text-risk-high';
    case 'MODERATE':
      return 'text-risk-mod';
    default:
      return 'text-risk-low';
  }
}

function getRiskBorder(risk: RiskLevel) {
  switch (risk) {
    case 'CRITICAL':
      return 'border-l-risk-crit';
    case 'HIGH':
      return 'border-l-risk-high';
    case 'MODERATE':
      return 'border-l-risk-mod';
    default:
      return 'border-l-risk-low';
  }
}

function getRiskBackground(risk: RiskLevel) {
  switch (risk) {
    case 'CRITICAL':
      return 'bg-risk-crit/5';
    case 'HIGH':
      return 'bg-risk-high/5';
    case 'MODERATE':
      return 'bg-risk-mod/5';
    default:
      return '';
  }
}

function getActionLabel(action: ActionType) {
  switch (action) {
    case 'repair':
      return 'Dispatch Repair';
    case 'inspect':
      return 'Inspect Zone';
    case 'maintenance':
      return 'Schedule Maintenance';
  }
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, monthIdx, day);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[d.getMonth()]} ${year}`;
    }
  } catch {}
  return dateStr;
}

export default function ActionPriority() {
  const navigate = useNavigate();

  const {
    roads,
    streetlights,
    loading,
    city,
    profileError,
    updateStreetlightStatus,
    updateRoadInspection,
    scheduleRoadMaintenance,
    updateRoadRepairStatus,
  } = useTaraData();

  // Maintenance Modal State
  const [maintenanceModalRoad, setMaintenanceModalRoad] = useState<{
    id: string;
    name: string;
    score: number;
    currentDate?: string;
    currentNotes?: string;
  } | null>(null);
  const [mDate, setMDate] = useState('');
  const [mNotes, setMNotes] = useState('');
  const [mError, setMError] = useState('');
  const [mSubmitting, setMSubmitting] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Generate priority items from real road risk scores
  const priorityItems = [...roads]
    .sort((a, b) => b.score - a.score)
    .map((road, idx) => {
      let action: ActionType = 'maintenance';
      let issue = 'General maintenance required';

      if (road.faultyLights > 0 || road.score >= 80) {
        action = 'repair';
        issue =
          road.faultyLights > 0
            ? `${road.faultyLights} Faulty Streetlights`
            : 'Critical Risk Lighting';
      } else if (road.score >= 60 || road.crimeNearby > 0) {
        action = 'inspect';
        issue =
          road.crimeNearby > 0
            ? 'Active Incident Proximity'
            : `High Risk Zone (${road.score}/100)`;
      } else if (road.nightExposure < 50) {
        action = 'maintenance';
        issue = 'Low Night Exposure Rating';
      }

      // Determine completion state directly from Firestore fields
      // 1. Repair: streetlights on this road are marked 'repair_dispatched' or road.repairStatus is 'dispatched'
      const roadLights = streetlights.filter(
        (l) => (l.road && l.road.toLowerCase() === road.name.toLowerCase()) || (l.roadId && l.roadId === road.id)
      );
      const isRepairDispatched =
        road.repairStatus === 'dispatched' ||
        (roadLights.length > 0 && roadLights.some((l) => l.status === 'repair_dispatched'));

      // 2. Inspection: road.inspectionStatus === 'logged'
      const isInspectionLogged = road.inspectionStatus === 'logged';

      // 3. Maintenance: road.maintenanceStatus === 'scheduled'
      const isMaintenanceScheduled = road.maintenanceStatus === 'scheduled';

      let isCompleted = false;
      let completedText = '';
      let scheduledDateText = '';

      if (action === 'repair' && isRepairDispatched) {
        isCompleted = true;
        completedText = '✓ Repair Dispatched';
      } else if (action === 'inspect' && isInspectionLogged) {
        isCompleted = true;
        completedText = '✓ Inspection Logged';
      } else if (action === 'maintenance' && isMaintenanceScheduled) {
        isCompleted = true;
        completedText = '✓ Maintenance Scheduled';
        scheduledDateText = road.maintenanceDate || '';
      }

      const context = `${road.crimeNearby} nearby incidents • ${road.reports} citizen reports • ${road.nightExposure}% night exposure`;

      return {
        id: road.id,
        rank: idx + 1,
        location: road.name,
        issue,
        risk: road.riskLevel,
        score: road.score,
        context,
        action,
        isCompleted,
        completedText,
        scheduledDateText,
        rawRoad: road,
      };
    });

  async function handleDispatchRepair(roadId: string, roadName: string) {
    try {
      // Find matching faulty or broken streetlights for this road and update them
      const lightsToUpdate = streetlights.filter(
        (l) =>
          ((l.road && l.road.toLowerCase() === roadName.toLowerCase()) || (l.roadId && l.roadId === roadId)) &&
          (l.status === 'faulty' || l.status === 'broken')
      );

      for (const light of lightsToUpdate) {
        await updateStreetlightStatus(light.id, 'repair_dispatched');
      }

      // Also persist repair status on the road document
      await updateRoadRepairStatus(roadId, 'dispatched');
    } catch (err) {
      console.warn('Could not update repair status:', err);
    }
  }

  async function handleInspectZone(roadId: string) {
    try {
      await updateRoadInspection(roadId);
    } catch (err) {
      console.warn('Could not update inspection status:', err);
    }
  }

  function handleOpenMaintenanceModal(road: { id: string; name: string; score: number; maintenanceDate?: string; maintenanceNotes?: string }) {
    setMaintenanceModalRoad({
      id: road.id,
      name: road.name,
      score: road.score,
      currentDate: road.maintenanceDate,
      currentNotes: road.maintenanceNotes,
    });
    setMDate(road.maintenanceDate || todayStr);
    setMNotes(road.maintenanceNotes || '');
    setMError('');
  }

  async function handleScheduleMaintenanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!maintenanceModalRoad) return;
    if (!mDate) {
      setMError('Please select a valid maintenance date.');
      return;
    }

    setMSubmitting(true);
    setMError('');

    try {
      await scheduleRoadMaintenance(maintenanceModalRoad.id, mDate, mNotes);
      setMaintenanceModalRoad(null);
    } catch (err) {
      console.warn('Failed to schedule maintenance in Firestore:', err);
      setMError('Failed to save to Firestore. Please try again.');
    } finally {
      setMSubmitting(false);
    }
  }

  function handleLocationClick(location: string) {
    navigate(`/map?search=${encodeURIComponent(location)}`);
  }

  return (
    <div className="p-8 max-w-7xl">
      {profileError && (
        <div className="mb-6 rounded-lg border border-risk-crit/30 bg-risk-crit/10 p-4 text-sm text-risk-crit">
          <p className="font-semibold">Authority Setup Note:</p>
          <p className="mt-1">{profileError}</p>
        </div>
      )}

      {/* HEADER */}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-brand-text">
            Intervention Priority — {city || 'Authority Command'}
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            Ranked list of streetlights and road segments requiring immediate authority action.
          </p>
        </div>

        <div className="text-xs text-brand-muted">
          {loading
            ? 'Calculating risk priorities...'
            : `${priorityItems.length} locations assessed from Firestore`}
        </div>
      </header>

      {/* TABLE */}
      <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface shadow-sm">
        <table className="w-full text-left text-sm text-brand-text">
          <thead className="border-b border-brand-border bg-brand-dark/50 text-xs uppercase text-brand-muted">
            <tr>
              <th className="px-6 py-4 font-medium">Rank</th>
              <th className="px-6 py-4 font-medium">Location</th>
              <th className="px-6 py-4 font-medium">Issue</th>
              <th className="px-6 py-4 font-medium">Proximity / Risk Context</th>
              <th className="px-6 py-4 font-medium">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-brand-border">
            {priorityItems.length > 0 ? (
              priorityItems.map((item) => {
                return (
                  <tr
                    key={item.id}
                    className={`
                      border-l-4
                      ${getRiskBorder(item.risk)}
                      ${getRiskBackground(item.risk)}
                      transition
                      hover:bg-brand-border/20
                    `}
                  >
                    {/* RANK */}
                    <td className={`px-6 py-5 font-bold ${getRiskText(item.risk)}`}>
                      #{item.rank}
                    </td>

                    {/* LOCATION */}
                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleLocationClick(item.location)}
                        className="text-left font-medium text-brand-text transition hover:text-primary hover:underline"
                      >
                        {item.location}
                      </button>
                    </td>

                    {/* ISSUE */}
                    <td className="px-6 py-5">
                      <span className="font-medium text-brand-text">{item.issue}</span>
                    </td>

                    {/* CONTEXT */}
                    <td className="px-6 py-5">
                      <span className={`mb-1 block text-xs font-semibold ${getRiskText(item.risk)}`}>
                        {item.risk} RISK ({item.score}/100)
                      </span>
                      <span className="text-xs text-brand-muted">{item.context}</span>
                    </td>

                    {/* ACTION */}
                    <td className="px-6 py-5">
                      {item.isCompleted ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1.5 rounded border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-500">
                            <CheckCircle2 size={13} />
                            {item.completedText}
                          </span>
                          {item.action === 'maintenance' && item.scheduledDateText && (
                            <div className="flex items-center gap-2 pl-1">
                              <span className="text-[11px] text-brand-muted font-mono">
                                {formatDisplayDate(item.scheduledDateText)}
                              </span>
                              <button
                                onClick={() => handleOpenMaintenanceModal(item.rawRoad)}
                                className="text-[10px] text-primary hover:underline"
                              >
                                (Reschedule)
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (item.action === 'repair') {
                              handleDispatchRepair(item.id, item.location);
                            } else if (item.action === 'inspect') {
                              handleInspectZone(item.id);
                            } else if (item.action === 'maintenance') {
                              handleOpenMaintenanceModal(item.rawRoad);
                            }
                          }}
                          className={
                            item.action === 'repair'
                              ? 'rounded bg-primary px-3 py-1.5 text-sm text-white shadow-sm transition hover:bg-primary/90'
                              : 'rounded border border-brand-border bg-brand-dark px-3 py-1.5 text-sm text-brand-text transition hover:bg-brand-border'
                          }
                        >
                          {getActionLabel(item.action)}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-brand-muted">
                  {loading
                    ? 'Loading priority actions from Firestore...'
                    : `No priority items found for ${city || 'this city'}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SCHEDULE MAINTENANCE MODAL */}
      {maintenanceModalRoad && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-brand-border bg-brand-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Wrench size={18} className="text-primary" />
                <h3 className="text-base font-semibold text-brand-text">Schedule Maintenance</h3>
              </div>
              <button
                onClick={() => setMaintenanceModalRoad(null)}
                className="text-brand-muted hover:text-brand-text p-1 rounded transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleMaintenanceSubmit} className="space-y-4">
              {mError && (
                <div className="p-2.5 rounded bg-risk-crit/10 border border-risk-crit/20 text-risk-crit text-xs">
                  {mError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-muted mb-1">
                  Location
                </label>
                <div className="px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-sm font-medium text-brand-text flex items-center justify-between">
                  <span>{maintenanceModalRoad.name}</span>
                  <span className="text-xs text-brand-muted font-mono">Score: {maintenanceModalRoad.score}/100</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-muted mb-1">
                  Maintenance Date <span className="text-risk-crit">*</span>
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                  required
                  className="w-full rounded-lg bg-brand-dark border border-brand-border px-3 py-2 text-sm text-brand-text outline-none focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-muted mb-1">
                  Optional Notes / Work Instructions
                </label>
                <textarea
                  rows={3}
                  value={mNotes}
                  onChange={(e) => setMNotes(e.target.value)}
                  placeholder="e.g. Tree pruning near pole #4, cabling inspection..."
                  className="w-full rounded-lg bg-brand-dark border border-brand-border p-3 text-xs text-brand-text placeholder:text-brand-muted outline-none focus:border-primary transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setMaintenanceModalRoad(null)}
                  disabled={mSubmitting}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-brand-border text-brand-muted hover:text-brand-text hover:bg-brand-dark transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mSubmitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white shadow-sm transition flex items-center gap-1.5"
                >
                  <Calendar size={14} />
                  {mSubmitting ? 'Saving...' : 'Schedule Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}