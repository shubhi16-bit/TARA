import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  calculateRoadRisk,
  categorizeRiskLevel,
  parseIncidentAgeHours,
} from './riskEngine';
import type { RiskLevel, RiskFactorsBreakdown } from './riskEngine';

export type { RiskLevel };

export interface Road {
  id: string;
  name: string;
  score: number;
  riskLevel: RiskLevel;
  factors?: RiskFactorsBreakdown;
  faultyLights: number;
  totalLights: number;
  crimeNearby: number;
  reports: number;
  nightExposure: number;
  coordinates: [number, number][];
  city?: string;
  cityId?: string;
  inspectionStatus?: string; // 'logged' | 'pending'
  inspectedAt?: any;
  maintenanceStatus?: string; // 'scheduled' | 'in_progress' | 'completed'
  maintenanceDate?: string;
  maintenanceNotes?: string;
  repairStatus?: string; // 'dispatched'
}

export interface Crime {
  id: string;
  type: string;
  desc?: string;
  lat: number | null;
  lng: number | null;
  time: string;
  severity: RiskLevel;
  city?: string;
  cityId?: string;
  timestamp?: any;
  district?: string;
  policeStation?: string;
  source?: string;
  sourceUrl?: string;
  riskRelevance?: number;
}

export interface Streetlight {
  id: string;
  lat: number;
  lng: number;
  road: string;
  status: string; // 'working' | 'faulty' | 'broken' | 'repair_dispatched' | 'repaired'
  city?: string;
  roadId?: string;
}

export interface CommunityReport {
  id: string;
  type: string;
  issueType?: string;
  desc?: string;
  notes?: string;
  lat: number;
  lng: number;
  time: string;
  status: 'OPEN' | 'VERIFIED' | 'RESOLVED' | 'logged' | 'inReview' | 'inRepair' | 'resolved';
  verificationStatus?: string;
  photoUrls?: string[];
  imageUrl?: string;
  city?: string;
  cityId?: string;
  road?: string;
  roadId?: string;
  location?: string;
  locationAddress?: string;
  lightsDown?: number;
  userId?: string;
  userPhone?: string;
  timestamp?: any;
  createdAt?: any;
  adminNotes?: string;
  riskRelevance?: number;
}

export interface RiskSnapshot {
  id: string;
  cityId?: string;
  city?: string;
  timestamp?: any;
  date?: string;
  timeLabel?: string;
  overallScore?: number;
  avgRiskScore?: number;
}

export interface TaraDataState {
  roads: Road[];
  crimes: Crime[];
  streetlights: Streetlight[];
  reports: CommunityReport[];
  riskSnapshots: RiskSnapshot[];
  loading: boolean;
  error: string | null;
}

export function computeRiskLevel(score: number): RiskLevel {
  return categorizeRiskLevel(score);
}

export function parseCoordinates(raw: any): [number, number][] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    if (Array.isArray(raw[0])) {
      return raw as [number, number][];
    }
    if (typeof raw[0] === 'object' && raw[0] !== null) {
      return raw.map((pt: any) => [
        typeof pt.lat === 'number' ? pt.lat : typeof pt.latitude === 'number' ? pt.latitude : 0,
        typeof pt.lng === 'number' ? pt.lng : typeof pt.longitude === 'number' ? pt.longitude : 0,
      ]);
    }
    if (typeof raw[0] === 'string') {
      return raw.map((s: string) => {
        const [lat, lng] = s.split(',').map(Number);
        return [lat || 0, lng || 0];
      });
    }
  }
  return [];
}

// Format relative time or ISO timestamp
function formatTime(val: any): string {
  if (!val) return 'Just now';
  if (typeof val === 'string') return val;
  if (val.toDate && typeof val.toDate === 'function') {
    const date = val.toDate();
    const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} mins ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  return 'Recently';
}

function formatSnapshotDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val.toDate && typeof val.toDate === 'function') {
    const d = val.toDate();
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return '';
}

/**
 * Recomputes road risk scores dynamically using the deterministic TARA risk engine
 * from actual Firestore entities (streetlights, crimes, community reports, and night footfall).
 */
function enrichRoadsWithRiskEngine(
  rawRoads: Road[],
  lights: Streetlight[],
  crimesList: Crime[],
  reportsList: CommunityReport[]
): Road[] {
  return rawRoads.map((road) => {
    const roadNameLower = road.name.toLowerCase();

    // 1. Streetlights associated with this road
    const matchingLights = lights.filter(
      (l) =>
        (l.road && (l.road.toLowerCase() === roadNameLower || roadNameLower.includes(l.road.toLowerCase()) || l.road.toLowerCase().includes(roadNameLower))) ||
        (l.roadId && l.roadId === road.id)
    );
    const faultyFromLights = matchingLights.filter(
      (l) => l.status === 'faulty' || l.status === 'broken'
    ).length;
    const totalL = matchingLights.length > 0 ? matchingLights.length : (road.totalLights || 10);
    const faultyL = matchingLights.length > 0 ? faultyFromLights : (road.faultyLights || 0);

    // 2. Crimes associated with this road
    const matchingCrimes = crimesList.filter(
      (c) =>
        (c.desc && c.desc.toLowerCase().includes(roadNameLower)) ||
        (c.district && c.district.toLowerCase().includes(roadNameLower))
    );
    const crimeCount = matchingCrimes.length;

    // Determine highest crime severity
    let highestCrimeSeverity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | undefined = undefined;
    if (matchingCrimes.some((c) => c.severity === 'CRITICAL')) {
      highestCrimeSeverity = 'CRITICAL';
    } else if (matchingCrimes.some((c) => c.severity === 'HIGH')) {
      highestCrimeSeverity = 'HIGH';
    } else if (matchingCrimes.some((c) => c.severity === 'MODERATE')) {
      highestCrimeSeverity = 'MODERATE';
    } else if (matchingCrimes.some((c) => c.severity === 'LOW')) {
      highestCrimeSeverity = 'LOW';
    }

    // Determine latest incident age in hours
    let minIncidentAgeHours: number | undefined = undefined;
    for (const c of matchingCrimes) {
      const age = parseIncidentAgeHours(c.time, c.timestamp);
      if (age !== undefined && (minIncidentAgeHours === undefined || age < minIncidentAgeHours)) {
        minIncidentAgeHours = age;
      }
    }

    // 3. Active Community Reports (OPEN, VERIFIED, logged, inReview, inRepair; RESOLVED reports do not contribute to risk)
    const matchingReports = reportsList.filter((r) => {
      const isResolved = (r.status || '').toLowerCase() === 'resolved';
      if (isResolved) return false;

      // 1. Direct match by roadId
      if (r.roadId && r.roadId === road.id) return true;

      // 2. Direct match by road name
      if (r.road && (r.road.toLowerCase() === roadNameLower || roadNameLower.includes(r.road.toLowerCase()) || r.road.toLowerCase().includes(roadNameLower))) {
        return true;
      }

      // 3. Textual mentions in location, notes, or desc
      if (
        (r.location && r.location.toLowerCase().includes(roadNameLower)) ||
        (r.desc && r.desc.toLowerCase().includes(roadNameLower)) ||
        (r.notes && r.notes.toLowerCase().includes(roadNameLower))
      ) {
        return true;
      }

      // 4. Geographic proximity matching (within ~400m)
      if (r.lat && r.lng && Array.isArray(road.coordinates)) {
        for (const pt of road.coordinates) {
          const pLat = Array.isArray(pt) ? pt[0] : ((pt as any)?.lat || (pt as any)?.latitude);
          const pLng = Array.isArray(pt) ? pt[1] : ((pt as any)?.lng || (pt as any)?.longitude);
          if (pLat && pLng) {
            const dist = Math.hypot(r.lat - pLat, r.lng - pLng);
            if (dist < 0.004) {
              return true;
            }
          }
        }
      }

      return false;
    });
    const activeReportsCount = matchingReports.length;

    // 4. Calculate dynamic deterministic risk using TARA risk engine
    const footfallRating = road.nightExposure !== undefined ? road.nightExposure : 50;

    const riskResult = calculateRoadRisk({
      faultyLights: faultyL,
      totalLights: totalL,
      crimeCount,
      highestCrimeSeverity,
      reportsCount: activeReportsCount,
      footfallRating,
      lastIncidentAgeHours: minIncidentAgeHours,
    });

    return {
      ...road,
      score: riskResult.score,
      safetyScore: 100 - riskResult.score,
      riskLevel: riskResult.riskLevel,
      factors: riskResult.factors,
      faultyLights: faultyL,
      totalLights: totalL,
      crimeNearby: crimeCount,
      reports: activeReportsCount,
      nightExposure: footfallRating,
    };
  });
}

/**
 * Subscribe to live Firestore collections for a given city.
 */
export function subscribeToCityData(
  city: string,
  onData: (data: TaraDataState) => void
): () => void {
  let rawRoads: Road[] = [];
  let crimes: Crime[] = [];
  let streetlights: Streetlight[] = [];
  let reports: CommunityReport[] = [];
  let riskSnapshots: RiskSnapshot[] = [];
  let loadedCollections = 0;
  const totalCollections = 5;

  const emit = () => {
    const enrichedRoads = enrichRoadsWithRiskEngine(rawRoads, streetlights, crimes, reports);

    // Development-only verification logging showing raw factors & final score for each road
    if (enrichedRoads.length > 0 && typeof console !== 'undefined' && console.table) {
      console.groupCollapsed(
        `[TARA Live Risk Engine] Dynamic recalculation for ${enrichedRoads.length} roads (${new Date().toLocaleTimeString()})`
      );
      console.table(
        enrichedRoads.map((r) => ({
          'Road Name': r.name,
          'Crime Factor (35%)': r.factors?.crime ?? 0,
          'Lighting Factor (25%)': r.factors?.lighting ?? 0,
          'Community Reports (15%)': r.factors?.communityReports ?? 0,
          'Footfall Risk (15%)': r.factors?.footfall ?? 0,
          'Recency Factor (10%)': r.factors?.recency ?? 0,
          'Final Score': r.score,
          'Risk Level': r.riskLevel,
        }))
      );
      console.groupEnd();
    }

    onData({
      roads: enrichedRoads,
      crimes,
      streetlights,
      reports,
      riskSnapshots,
      loading: loadedCollections < totalCollections,
      error: null,
    });
  };

  // 1. Roads listener
  const roadsRef = collection(db, 'roads');
  const unsubRoads = onSnapshot(
    roadsRef,
    (snap) => {
      if (!snap.empty) {
        rawRoads = snap.docs
          .map((d) => {
            const data = d.data();
            const score = typeof data.score === 'number' ? data.score : typeof data.overall_risk_score === 'number' ? data.overall_risk_score : 0;
            return {
              id: d.id,
              name: data.name || data.road_name || 'Unnamed Road',
              score,
              riskLevel: categorizeRiskLevel(score),
              faultyLights: data.faultyLights || data.faulty_lights || 0,
              totalLights: data.totalLights || data.total_lights || 0,
              crimeNearby: data.crimeNearby || data.crime_count || 0,
              reports: data.reports || data.report_count || 0,
              nightExposure: data.nightExposure || data.pedestrian_exposure_score || 50,
              coordinates: parseCoordinates(data.coordinates || data.points || (data.latitude && data.longitude ? [{ lat: data.latitude, lng: data.longitude }] : [])),
              city: data.city || data.cityId,
              cityId: data.cityId || data.city,
              inspectionStatus: data.inspectionStatus,
              inspectedAt: data.inspectedAt,
              maintenanceStatus: data.maintenanceStatus,
              maintenanceDate: data.maintenanceDate,
              maintenanceNotes: data.maintenanceNotes,
              repairStatus: data.repairStatus,
            } as Road;
          })
          .filter((r) => !city || !r.city || r.city.toLowerCase() === city.toLowerCase() || (r.cityId && r.cityId.toLowerCase() === city.toLowerCase()));
      } else {
        getDocs(collection(db, 'road_segments'))
          .then((segSnap) => {
            rawRoads = segSnap.docs
              .map((d) => {
                const data = d.data();
                const score = typeof data.overall_risk_score === 'number' ? data.overall_risk_score : 0;
                return {
                  id: d.id,
                  name: data.road_name || data.name || 'Segment ' + d.id,
                  score,
                  riskLevel: categorizeRiskLevel(score),
                  faultyLights: data.lighting_score ? Math.round(data.lighting_score / 15) : 0,
                  totalLights: 10,
                  crimeNearby: data.crime_score ? Math.round(data.crime_score / 25) : 0,
                  reports: data.community_report_score ? Math.round(data.community_report_score / 15) : 0,
                  nightExposure: data.pedestrian_exposure_score || 50,
                  coordinates: parseCoordinates(data.coordinates || data.points || (data.latitude && data.longitude ? [{ lat: data.latitude, lng: data.longitude }] : [])),
                  city: data.city || data.cityId,
                  cityId: data.cityId || data.city,
                  inspectionStatus: data.inspectionStatus,
                  inspectedAt: data.inspectedAt,
                  maintenanceStatus: data.maintenanceStatus,
                  maintenanceDate: data.maintenanceDate,
                  maintenanceNotes: data.maintenanceNotes,
                  repairStatus: data.repairStatus,
                } as Road;
              })
              .filter((r) => !city || !r.city || r.city.toLowerCase() === city.toLowerCase() || (r.cityId && r.cityId.toLowerCase() === city.toLowerCase()));
            emit();
          })
          .catch(() => {});
      }
      loadedCollections++;
      emit();
    },
    (err) => {
      console.warn('Roads snapshot error:', err);
      loadedCollections++;
      emit();
    }
  );

  // 2. Streetlights listener
  const lightsRef = collection(db, 'streetlights');
  const unsubLights = onSnapshot(
    lightsRef,
    (snap) => {
      streetlights = snap.docs
        .map((d) => {
          const data = d.data();
          const lat = data.lat || (Array.isArray(data.loc) ? data.loc[0] : 0);
          const lng = data.lng || (Array.isArray(data.loc) ? data.loc[1] : 0);
          return {
            id: d.id,
            lat: typeof lat === 'number' ? lat : 0,
            lng: typeof lng === 'number' ? lng : 0,
            road: data.road || data.roadName || data.roadId || 'Street',
            status: data.status || 'faulty',
            city: data.city || data.cityId,
            roadId: data.roadId,
          } as Streetlight;
        })
        .filter((l) => !city || !l.city || l.city.toLowerCase() === city.toLowerCase());
      loadedCollections++;
      emit();
    },
    (err) => {
      console.warn('Streetlights snapshot error:', err);
      loadedCollections++;
      emit();
    }
  );

  // 3. Crime reports listener
  const crimeRef = collection(db, 'crimeReports');
  const unsubCrimes = onSnapshot(
    crimeRef,
    (snap) => {
      if (!snap.empty) {
        crimes = snap.docs
          .map((d) => {
            const data = d.data();
            const rawLat = data.lat !== undefined ? data.lat : (Array.isArray(data.loc) ? data.loc[0] : null);
            const rawLng = data.lng !== undefined ? data.lng : (Array.isArray(data.loc) ? data.loc[1] : null);
            return {
              id: d.id,
              type: data.type || 'Incident',
              desc: data.desc || data.description || data.title || '',
              lat: typeof rawLat === 'number' ? rawLat : null,
              lng: typeof rawLng === 'number' ? rawLng : null,
              time: formatTime(data.timestamp || data.time || data.pressDate),
              severity: (data.severity || 'HIGH') as RiskLevel,
              city: data.city || data.cityId,
              cityId: data.cityId || data.city,
              timestamp: data.timestamp,
              district: data.district,
              policeStation: data.policeStation,
              source: data.source,
              sourceUrl: data.sourceUrl,
              riskRelevance: data.riskRelevance,
            } as Crime;
          })
          .filter((c) => !city || !c.city || c.city.toLowerCase() === city.toLowerCase() || (c.cityId && c.cityId.toLowerCase() === city.toLowerCase()));
      } else {
        getDocs(collection(db, 'crimes'))
          .then((cSnap) => {
            crimes = cSnap.docs
              .map((d) => {
                const data = d.data();
                const rawLat = data.lat !== undefined ? data.lat : (Array.isArray(data.loc) ? data.loc[0] : null);
                const rawLng = data.lng !== undefined ? data.lng : (Array.isArray(data.loc) ? data.loc[1] : null);
                return {
                  id: d.id,
                  type: data.type || 'Incident',
                  desc: data.desc || data.description || data.title || '',
                  lat: typeof rawLat === 'number' ? rawLat : null,
                  lng: typeof rawLng === 'number' ? rawLng : null,
                  time: formatTime(data.timestamp || data.time || data.pressDate),
                  severity: (data.severity || 'HIGH') as RiskLevel,
                  city: data.city || data.cityId,
                  cityId: data.cityId || data.city,
                  timestamp: data.timestamp,
                  district: data.district,
                  policeStation: data.policeStation,
                  source: data.source,
                  sourceUrl: data.sourceUrl,
                  riskRelevance: data.riskRelevance,
                } as Crime;
              })
              .filter((c) => !city || !c.city || c.city.toLowerCase() === city.toLowerCase() || (c.cityId && c.cityId.toLowerCase() === city.toLowerCase()));
            emit();
          })
          .catch(() => {});
      }
      loadedCollections++;
      emit();
    },
    (err) => {
      console.warn('Crimes snapshot error:', err);
      loadedCollections++;
      emit();
    }
  );

  // 4. Community reports listener
  const reportsRef = collection(db, 'communityReports');
  const unsubReports = onSnapshot(
    reportsRef,
    (snap) => {
      if (!snap.empty) {
        reports = snap.docs
          .map((d) => {
            const data = d.data();
            const lat = data.lat || data.latitude || (Array.isArray(data.loc) ? data.loc[0] : 0);
            const lng = data.lng || data.longitude || (Array.isArray(data.loc) ? data.loc[1] : 0);
            const photoUrls = data.photoUrls || (data.photoUrl ? [data.photoUrl] : (data.imageUrl ? [data.imageUrl] : []));
            return {
              id: d.id,
              type: data.issueType || data.type || 'Community Report',
              issueType: data.issueType || data.type,
              desc: data.desc || data.notes || data.description || '',
              notes: data.notes || data.desc || '',
              lat: typeof lat === 'number' ? lat : 0,
              lng: typeof lng === 'number' ? lng : 0,
              time: formatTime(data.createdAt || data.timestamp || data.time),
              status: (data.status || data.verificationStatus || 'logged') as any,
              verificationStatus: data.verificationStatus || data.status || 'OPEN',
              photoUrls: photoUrls,
              imageUrl: data.imageUrl || (photoUrls.length > 0 ? photoUrls[0] : undefined),
              city: data.city || data.cityId,
              cityId: data.cityId || data.city,
              road: data.road,
              roadId: data.roadId,
              location: data.location || data.locationAddress,
              locationAddress: data.locationAddress || data.location,
              lightsDown: data.lightsDown,
              userId: data.userId || data.userPhone,
              userPhone: data.userPhone || data.userId,
              timestamp: data.timestamp,
              createdAt: data.createdAt || data.timestamp,
              adminNotes: data.adminNotes,
              riskRelevance: data.riskRelevance,
            } as CommunityReport;
          })
          .filter((r) => !city || !r.city || r.city.toLowerCase() === city.toLowerCase() || (r.cityId && r.cityId.toLowerCase() === city.toLowerCase()));

        console.log('[TARA] Community reports received:', reports.length);
      } else {
        getDocs(collection(db, 'reports'))
          .then((rSnap) => {
            reports = rSnap.docs
              .map((d) => {
                const data = d.data();
                const lat = data.lat || data.latitude || (Array.isArray(data.loc) ? data.loc[0] : 0);
                const lng = data.lng || data.longitude || (Array.isArray(data.loc) ? data.loc[1] : 0);
                const photoUrls = data.photoUrls || (data.photoUrl ? [data.photoUrl] : (data.imageUrl ? [data.imageUrl] : []));
                return {
                  id: d.id,
                  type: data.issueType || data.type || 'Community Report',
                  issueType: data.issueType || data.type,
                  desc: data.desc || data.notes || data.description || '',
                  notes: data.notes || data.desc || '',
                  lat: typeof lat === 'number' ? lat : 0,
                  lng: typeof lng === 'number' ? lng : 0,
                  time: formatTime(data.timestamp || data.createdAt || data.time),
                  status: (data.status || data.verificationStatus || 'logged') as any,
                  verificationStatus: data.verificationStatus || data.status || 'OPEN',
                  photoUrls: photoUrls,
                  imageUrl: data.imageUrl || (photoUrls.length > 0 ? photoUrls[0] : undefined),
                  city: data.city || data.cityId,
                  cityId: data.cityId || data.city,
                  road: data.road,
                  roadId: data.roadId,
                  lightsDown: data.lightsDown,
                  userId: data.userId || data.userPhone,
                  userPhone: data.userPhone || data.userId,
                  timestamp: data.timestamp,
                  adminNotes: data.adminNotes,
                  riskRelevance: data.riskRelevance,
                } as CommunityReport;
              })
              .filter((r) => !city || !r.city || r.city.toLowerCase() === city.toLowerCase() || (r.cityId && r.cityId.toLowerCase() === city.toLowerCase()));
            emit();
          })
          .catch(() => {});
      }
      loadedCollections++;
      emit();
    },
    (err) => {
      console.warn('Community reports snapshot error:', err);
      loadedCollections++;
      emit();
    }
  );

  // 5. Risk Snapshots listener
  const snapshotsRef = collection(db, 'riskSnapshots');
  const unsubSnapshots = onSnapshot(
    snapshotsRef,
    (snap) => {
      riskSnapshots = snap.docs
        .map((d) => {
          const data = d.data();
          const score = typeof data.overallScore === 'number' ? data.overallScore : typeof data.avgRiskScore === 'number' ? data.avgRiskScore : 0;
          return {
            id: d.id,
            cityId: data.cityId || data.city,
            city: data.city || data.cityId,
            timestamp: data.timestamp,
            date: data.date || formatSnapshotDate(data.timestamp),
            timeLabel: data.timeLabel || formatSnapshotDate(data.timestamp),
            overallScore: score,
            avgRiskScore: score,
          } as RiskSnapshot;
        })
        .filter((s) => !city || !s.city || s.city.toLowerCase() === city.toLowerCase());
      loadedCollections++;
      emit();
    },
    (err) => {
      console.warn('Risk snapshots snapshot error:', err);
      loadedCollections++;
      emit();
    }
  );

  return () => {
    unsubRoads();
    unsubLights();
    unsubCrimes();
    unsubReports();
    unsubSnapshots();
  };
}

/**
 * Update Streetlight Status in Firestore
 */
export async function updateStreetlightStatus(
  id: string,
  status: string
): Promise<void> {
  const lightRef = doc(db, 'streetlights', id);
  await updateDoc(lightRef, {
    status,
    updatedAt: new Date(),
  });
}

/**
 * Update Road Inspection Status in Firestore
 */
export async function updateRoadInspection(roadId: string): Promise<void> {
  const roadRef = doc(db, 'roads', roadId);
  try {
    await updateDoc(roadRef, {
      inspectionStatus: 'logged',
      inspectedAt: new Date(),
      updatedAt: new Date(),
    });
  } catch {
    const fallbackRef = doc(db, 'road_segments', roadId);
    await updateDoc(fallbackRef, {
      inspectionStatus: 'logged',
      inspectedAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Schedule Road Maintenance in Firestore
 */
export async function scheduleRoadMaintenance(
  roadId: string,
  maintenanceDate: string,
  notes?: string
): Promise<void> {
  const payload: any = {
    maintenanceStatus: 'scheduled',
    maintenanceDate,
    maintenanceNotes: notes || '',
    maintenanceScheduledAt: new Date(),
    updatedAt: new Date(),
  };
  const roadRef = doc(db, 'roads', roadId);
  try {
    await updateDoc(roadRef, payload);
  } catch {
    const fallbackRef = doc(db, 'road_segments', roadId);
    await updateDoc(fallbackRef, payload);
  }
}

/**
 * Update Road Repair Status in Firestore
 */
export async function updateRoadRepairStatus(
  roadId: string,
  status: string
): Promise<void> {
  const payload = {
    repairStatus: status,
    updatedAt: new Date(),
  };
  const roadRef = doc(db, 'roads', roadId);
  try {
    await updateDoc(roadRef, payload);
  } catch {
    const fallbackRef = doc(db, 'road_segments', roadId);
    await updateDoc(fallbackRef, payload);
  }
}

/**
 * Update Community Report Status in Firestore
 */
export async function updateReportStatus(
  id: string,
  status: 'OPEN' | 'VERIFIED' | 'RESOLVED',
  adminNotes?: string
): Promise<void> {
  const reportRef = doc(db, 'communityReports', id);
  const payload: any = {
    status,
    verificationStatus: status,
    updatedAt: new Date(),
  };
  if (adminNotes !== undefined) {
    payload.adminNotes = adminNotes;
  }
  try {
    await updateDoc(reportRef, payload);
  } catch {
    const fallbackRef = doc(db, 'reports', id);
    await updateDoc(fallbackRef, payload);
  }
}
