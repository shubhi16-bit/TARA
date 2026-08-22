/**
 * TARA POI-Based Night Pedestrian Exposure & Footfall Engine (Backend Service)
 *
 * Computes deterministic, explainable night pedestrian exposure for roads
 * using physical POIs (Transit hubs, markets, hospitals, malls, colleges, parks, bus stops, govt offices).
 *
 * NOTE: Crime data is NEVER used as an input to footfall estimation.
 */

export type POICategory =
  | 'TRANSIT_HUB'
  | 'MARKET'
  | 'HOSPITAL'
  | 'MALL_DINING'
  | 'COLLEGE'
  | 'BUS_STOP'
  | 'PARK'
  | 'GOVT_OFFICE';

export interface POI {
  id: string;
  name: string;
  category: POICategory;
  lat: number;
  lng: number;
  cityId: string;
}

export interface ContributingPOI {
  id: string;
  name: string;
  category: POICategory;
  categoryLabel: string;
  distanceMeters: number;
  baseWeight: number;
  nightRetention: number;
  decay: number;
  effectiveContribution: number;
}

export interface ExposureFactors {
  baselineRoadConnectivity: number;
  timeOfDayFactor: number;
  evaluationHour: number;
  rawPoiScore: number;
  totalNightExposure: number;
  footfallRiskFactor: number;
  contributingPOIs: ContributingPOI[];
}

export const POI_WEIGHTS: Record<
  POICategory,
  { baseWeight: number; nightRetention: number; label: string }
> = {
  TRANSIT_HUB: { baseWeight: 18, nightRetention: 0.90, label: 'Transit Hub / Metro' },
  MARKET: { baseWeight: 14, nightRetention: 0.80, label: 'Market / Commercial' },
  HOSPITAL: { baseWeight: 14, nightRetention: 0.85, label: 'Hospital / 24x7 Healthcare' },
  MALL_DINING: { baseWeight: 10, nightRetention: 0.75, label: 'Mall & Night Dining' },
  COLLEGE: { baseWeight: 8, nightRetention: 0.60, label: 'College / Hostel' },
  BUS_STOP: { baseWeight: 8, nightRetention: 0.70, label: 'Bus Terminal / Transit Stop' },
  PARK: { baseWeight: 6, nightRetention: 0.40, label: 'Public Park / Cultural Centre' },
  GOVT_OFFICE: { baseWeight: 4, nightRetention: 0.15, label: 'Govt / Administrative Office' },
};

/**
 * Structured POI Dataset for Delhi Central / New Delhi Sector
 */
export const DELHI_POIS: POI[] = [
  // 1. Transit Hubs & Metro Stations
  { id: 'poi_metro_rajiv', name: 'Rajiv Chowk Metro Station', category: 'TRANSIT_HUB', lat: 28.6328, lng: 77.2197, cityId: 'delhi' },
  { id: 'poi_metro_janpath', name: 'Janpath Metro Station', category: 'TRANSIT_HUB', lat: 28.6258, lng: 77.2185, cityId: 'delhi' },
  { id: 'poi_metro_patel', name: 'Patel Chowk Metro Station', category: 'TRANSIT_HUB', lat: 28.6231, lng: 77.2132, cityId: 'delhi' },
  { id: 'poi_metro_central_sec', name: 'Central Secretariat Metro', category: 'TRANSIT_HUB', lat: 28.6148, lng: 77.2118, cityId: 'delhi' },
  { id: 'poi_metro_barakhamba', name: 'Barakhamba Road Metro Station', category: 'TRANSIT_HUB', lat: 28.6304, lng: 77.2272, cityId: 'delhi' },
  { id: 'poi_metro_shivaji', name: 'Shivaji Stadium Metro Station', category: 'TRANSIT_HUB', lat: 28.6344, lng: 77.2145, cityId: 'delhi' },
  { id: 'poi_metro_rkashram', name: 'RK Ashram Marg Metro Station', category: 'TRANSIT_HUB', lat: 28.6392, lng: 77.2090, cityId: 'delhi' },

  // 2. Markets & Commercial Centres
  { id: 'poi_mkt_janpath', name: 'Janpath Flea Market & Tibetan Bazaar', category: 'MARKET', lat: 28.6285, lng: 77.2190, cityId: 'delhi' },
  { id: 'poi_mkt_cp_inner', name: 'Connaught Place Inner Circle Retail', category: 'MARKET', lat: 28.6325, lng: 77.2195, cityId: 'delhi' },
  { id: 'poi_mkt_palika', name: 'Palika Bazaar Underground Complex', category: 'MARKET', lat: 28.6310, lng: 77.2192, cityId: 'delhi' },
  { id: 'poi_mkt_shankar', name: 'Shankar Market & Food Stalls', category: 'MARKET', lat: 28.6340, lng: 77.2225, cityId: 'delhi' },
  { id: 'poi_mkt_panchkuian', name: 'Panchkuian Commercial Market', category: 'MARKET', lat: 28.6450, lng: 77.2065, cityId: 'delhi' },

  // 3. Hospitals & Healthcare (24/7 continuous footfall)
  { id: 'poi_hosp_rml', name: 'Dr. Ram Manohar Lohia (RML) Hospital', category: 'HOSPITAL', lat: 28.6248, lng: 77.2015, cityId: 'delhi' },
  { id: 'poi_hosp_lady_hardinge', name: 'Lady Hardinge Medical College & Hospital', category: 'HOSPITAL', lat: 28.6350, lng: 77.2128, cityId: 'delhi' },
  { id: 'poi_hosp_railway', name: 'Northern Railway Central Hospital', category: 'HOSPITAL', lat: 28.6415, lng: 77.2180, cityId: 'delhi' },

  // 4. Malls & Night Dining Precincts
  { id: 'poi_dine_regal', name: 'Regal Building & Dining Arcade', category: 'MALL_DINING', lat: 28.6315, lng: 77.2178, cityId: 'delhi' },
  { id: 'poi_dine_odeon', name: 'Odeon Complex & Outer Circle Food Hub', category: 'MALL_DINING', lat: 28.6345, lng: 77.2210, cityId: 'delhi' },
  { id: 'poi_dine_scindia', name: 'Scindia House Eateries & Cafes', category: 'MALL_DINING', lat: 28.6315, lng: 77.2215, cityId: 'delhi' },

  // 5. Colleges & Academic Hostels
  { id: 'poi_col_lhmc_hostel', name: 'LHMC Student & Resident Hostels', category: 'COLLEGE', lat: 28.6360, lng: 77.2135, cityId: 'delhi' },
  { id: 'poi_col_ywra', name: 'YWCA International Centre & Hostel', category: 'COLLEGE', lat: 28.6275, lng: 77.2120, cityId: 'delhi' },

  // 6. Bus Terminals & Commuter Transit Stops
  { id: 'poi_bus_shivaji', name: 'Shivaji Stadium DTC Bus Terminal', category: 'BUS_STOP', lat: 28.6348, lng: 77.2138, cityId: 'delhi' },
  { id: 'poi_bus_scindia', name: 'Scindia House Bus Hub', category: 'BUS_STOP', lat: 28.6318, lng: 77.2220, cityId: 'delhi' },
  { id: 'poi_bus_kg_marg', name: 'KG Marg Bus Stop', category: 'BUS_STOP', lat: 28.6345, lng: 77.2192, cityId: 'delhi' },

  // 7. Public Parks & Cultural Centres
  { id: 'poi_park_cp', name: 'Central Park Connaught Place', category: 'PARK', lat: 28.6328, lng: 77.2195, cityId: 'delhi' },
  { id: 'poi_park_mandi', name: 'Mandi House Cultural Precinct', category: 'PARK', lat: 28.6255, lng: 77.2340, cityId: 'delhi' },

  // 8. Govt & Administrative Complexes (Low night retention)
  { id: 'poi_govt_sansad', name: 'Sansad Bhavan / Parliament Complex', category: 'GOVT_OFFICE', lat: 28.6172, lng: 77.2081, cityId: 'delhi' },
  { id: 'poi_govt_rail', name: 'Rail Bhavan', category: 'GOVT_OFFICE', lat: 28.6198, lng: 77.2120, cityId: 'delhi' },
  { id: 'poi_govt_shastri', name: 'Shastri Bhavan', category: 'GOVT_OFFICE', lat: 28.6185, lng: 77.2140, cityId: 'delhi' },
  { id: 'poi_govt_patel', name: 'Patel Chowk Administrative Block', category: 'GOVT_OFFICE', lat: 28.6240, lng: 77.2125, cityId: 'delhi' },

  // 9. South-Central Delhi & Ring Road POIs (Lajpat Nagar Sector)
  { id: 'poi_metro_lajpat', name: 'Lajpat Nagar Metro Interchange (Pink & Violet)', category: 'TRANSIT_HUB', lat: 28.5705, lng: 77.2375, cityId: 'delhi' },
  { id: 'poi_mkt_lajpat_central', name: 'Lajpat Nagar Central Market & Street Food', category: 'MARKET', lat: 28.5677, lng: 77.2433, cityId: 'delhi' },
  { id: 'poi_hosp_moolchand', name: 'Moolchand Medcity & 24x7 Emergency', category: 'HOSPITAL', lat: 28.5655, lng: 77.2340, cityId: 'delhi' },
  { id: 'poi_bus_lajpat_ring', name: 'Lajpat Nagar Ring Road Bus Terminal', category: 'BUS_STOP', lat: 28.5695, lng: 77.2410, cityId: 'delhi' },
];

/**
 * Calculates geodesic distance between two lat/lng coordinates in meters using the Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes minimum distance in meters from a POI to a road's polyline coordinates
 */
export function minDistanceToRoadMeters(
  poiLat: number,
  poiLng: number,
  roadCoords: Array<{ lat: number; lng: number } | [number, number]>
): number {
  if (!roadCoords || roadCoords.length === 0) return Infinity;

  let minD = Infinity;
  for (const pt of roadCoords) {
    const rLat = Array.isArray(pt) ? pt[0] : (pt as any).lat || (pt as any).latitude;
    const rLng = Array.isArray(pt) ? pt[1] : (pt as any).lng || (pt as any).longitude;
    if (typeof rLat === 'number' && typeof rLng === 'number') {
      const d = calculateDistanceMeters(poiLat, poiLng, rLat, rLng);
      if (d < minD) minD = d;
    }
  }
  return minD;
}

/**
 * Time-of-Day Night Multiplier:
 * Evening Peak (20:00 - 22:30): 0.85
 * Late Night (22:30 - 00:30): 0.60
 * Deep Night (00:30 - 05:00): 0.35
 * Early Morning (05:00 - 08:00): 0.75
 * Daytime Standard (08:00 - 20:00): 1.00
 */
export function getTimeOfDayFactor(hour: number = 21): number {
  if (hour >= 20 && hour < 22.5) return 0.85;
  if (hour >= 22.5 || hour < 0.5) return 0.60;
  if (hour >= 0.5 && hour < 5.0) return 0.35;
  if (hour >= 5.0 && hour < 8.0) return 0.75;
  return 1.00;
}

/**
 * Calculate deterministic POI-based Night Exposure for a road.
 */
export function calculateRoadNightExposure(
  roadCoords: Array<{ lat: number; lng: number } | [number, number]>,
  options?: {
    pois?: POI[];
    hour?: number;
    baselineConnectivity?: number;
    maxDistanceMeters?: number;
  }
): ExposureFactors {
  const pois = options?.pois || DELHI_POIS;
  const hour = options?.hour !== undefined ? options.hour : 21.0; // Default evening 9 PM
  const baseline = options?.baselineConnectivity !== undefined ? options.baselineConnectivity : 10.0;
  const maxDist = options?.maxDistanceMeters || 350.0;
  const timeFactor = getTimeOfDayFactor(hour);

  const rawPOIs: ContributingPOI[] = [];

  for (const poi of pois) {
    const dist = minDistanceToRoadMeters(poi.lat, poi.lng, roadCoords);
    if (dist <= maxDist) {
      const config = POI_WEIGHTS[poi.category] || { baseWeight: 6, nightRetention: 0.5, label: poi.category };
      const decay = Math.max(0, 1 - dist / maxDist);
      const rawContribution = config.baseWeight * config.nightRetention * decay * timeFactor;

      rawPOIs.push({
        id: poi.id,
        name: poi.name,
        category: poi.category,
        categoryLabel: config.label,
        distanceMeters: Math.round(dist),
        baseWeight: config.baseWeight,
        nightRetention: config.nightRetention,
        decay: Number(decay.toFixed(3)),
        effectiveContribution: Number(rawContribution.toFixed(2)),
      });
    }
  }

  // Sort raw POIs by contribution descending
  rawPOIs.sort((a, b) => b.effectiveContribution - a.effectiveContribution);

  // Apply diminishing marginal returns aggregation:
  // Each subsequent POI k receives diminishing weight multiplier (1 / (1 + 0.18 * index))
  const contributingPOIs: ContributingPOI[] = [];
  let aggregatedPoiScore = 0;

  for (let i = 0; i < rawPOIs.length; i++) {
    const p = rawPOIs[i];
    const marginalMultiplier = 1 / (1 + 0.18 * i);
    const calibratedContribution = p.effectiveContribution * marginalMultiplier;
    aggregatedPoiScore += calibratedContribution;

    contributingPOIs.push({
      ...p,
      effectiveContribution: Number(calibratedContribution.toFixed(2)),
    });
  }

  const rawPoiScore = Number(aggregatedPoiScore.toFixed(2));
  const totalNightExposure = Math.max(0, Math.min(100, Math.round(baseline + rawPoiScore)));
  const footfallRiskFactor = Math.max(0, Math.min(100, 100 - totalNightExposure));

  return {
    baselineRoadConnectivity: baseline,
    timeOfDayFactor: timeFactor,
    evaluationHour: hour,
    rawPoiScore,
    totalNightExposure,
    footfallRiskFactor,
    contributingPOIs,
  };
}

