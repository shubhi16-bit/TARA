export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface RawRiskInputs {
  crimeFactor: number;            // 0 - 100 (from crime count & severity)
  lightingRiskFactor: number;     // 0 - 100 (faulty streetlight ratio)
  communityReportsFactor: number; // 0 - 100 (verified & open citizen reports)
  footfallExposureFactor: number; // 0 - 100 (inverted pedestrian footfall & exposure)
  recencyFactor: number;          // 0 - 100 (incident recency weight)
}

export interface RiskFactorsBreakdown {
  crime: number;
  lighting: number;
  communityReports: number;
  footfall: number;
  recency: number;
}

export interface RiskEngineResult {
  score: number;
  riskLevel: RiskLevel;
  factors: RiskFactorsBreakdown;
}

/**
 * TARA Deterministic Risk Weights
 * Crime: 35%
 * Lighting: 25%
 * Community Reports: 15%
 * Estimated Night Footfall / Exposure: 15%
 * Recency: 10%
 */
export const RISK_WEIGHTS = {
  CRIME: 0.35,
  LIGHTING: 0.25,
  COMMUNITY_REPORTS: 0.15,
  FOOTFALL: 0.15,
  RECENCY: 0.10,
} as const;

/**
 * Clamp a number between 0 and 100, handling NaN
 */
export function clamp0to100(val: number): number {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.max(0, Math.min(100, Math.round(val)));
}

/**
 * Categorize risk score into official TARA risk levels:
 * 0–29: LOW
 * 30–59: MODERATE
 * 60–79: HIGH
 * 80–100: CRITICAL
 */
export function categorizeRiskLevel(score: number): RiskLevel {
  const s = clamp0to100(score);
  if (s >= 80) return 'CRITICAL';
  if (s >= 60) return 'HIGH';
  if (s >= 30) return 'MODERATE';
  return 'LOW';
}

/**
 * Deterministic, explainable calculation of TARA Risk Score (0–100)
 */
export function calculateRisk(inputs: RawRiskInputs): RiskEngineResult {
  const crime = clamp0to100(inputs.crimeFactor);
  const lighting = clamp0to100(inputs.lightingRiskFactor);
  const communityReports = clamp0to100(inputs.communityReportsFactor);
  const footfall = clamp0to100(inputs.footfallExposureFactor);
  const recency = clamp0to100(inputs.recencyFactor);

  const weightedScore =
    crime * RISK_WEIGHTS.CRIME +
    lighting * RISK_WEIGHTS.LIGHTING +
    communityReports * RISK_WEIGHTS.COMMUNITY_REPORTS +
    footfall * RISK_WEIGHTS.FOOTFALL +
    recency * RISK_WEIGHTS.RECENCY;

  const score = clamp0to100(Math.round(weightedScore));
  const riskLevel = categorizeRiskLevel(score);

  return {
    score,
    riskLevel,
    factors: {
      crime,
      lighting,
      communityReports,
      footfall,
      recency,
    },
  };
}

/**
 * Parse human-readable or timestamp incident age into hours
 */
export function parseIncidentAgeHours(timeVal?: any, timestampVal?: any): number | undefined {
  if (timestampVal) {
    if (typeof timestampVal.toDate === 'function') {
      const ms = Date.now() - timestampVal.toDate().getTime();
      return Math.max(0, ms / (1000 * 60 * 60));
    }
    const parsed = new Date(timestampVal);
    if (!isNaN(parsed.getTime())) {
      const ms = Date.now() - parsed.getTime();
      return Math.max(0, ms / (1000 * 60 * 60));
    }
  }

  if (typeof timeVal === 'string') {
    const t = timeVal.toLowerCase().trim();
    if (t.includes('just now') || t.includes('sec')) return 0.1;
    
    // e.g. "10 mins ago", "30 mins ago"
    const minMatch = t.match(/(\d+)\s*(?:min|mins|minute|minutes)/);
    if (minMatch) {
      return parseInt(minMatch[1], 10) / 60;
    }

    // e.g. "1 hour ago", "3 hours ago"
    const hourMatch = t.match(/(\d+)\s*(?:hour|hours|hr|hrs)/);
    if (hourMatch) {
      return parseInt(hourMatch[1], 10);
    }

    // e.g. "1 day ago", "2 days ago"
    const dayMatch = t.match(/(\d+)\s*(?:day|days)/);
    if (dayMatch) {
      return parseInt(dayMatch[1], 10) * 24;
    }
  }

  return undefined;
}

/**
 * Helper to compute road-level factors from raw entity metrics
 */
export function calculateRoadRisk(params: {
  faultyLights: number;
  totalLights: number;
  crimeCount: number;
  highestCrimeSeverity?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  reportsCount: number;
  footfallRating?: number; // Estimated Night Footfall/Exposure (0-100, default 50)
  lastIncidentAgeHours?: number; // hours since last incident
}): RiskEngineResult {
  // 1. Lighting factor: Ratio of faulty to total lights (0-100)
  // No division by zero. If totalLights is 0, lighting factor is 0.
  const lightingFactor =
    params.totalLights > 0
      ? clamp0to100(Math.round((params.faultyLights / params.totalLights) * 100))
      : 0;

  // 2. Crime factor: Scale by count and severity
  let crimeFactor = 0;
  if (params.crimeCount > 0) {
    let severityMultiplier = 1.0;
    if (params.highestCrimeSeverity === 'CRITICAL') severityMultiplier = 1.5;
    else if (params.highestCrimeSeverity === 'HIGH') severityMultiplier = 1.25;
    else if (params.highestCrimeSeverity === 'MODERATE') severityMultiplier = 1.0;
    else if (params.highestCrimeSeverity === 'LOW') severityMultiplier = 0.75;

    crimeFactor = clamp0to100(Math.min(100, Math.round(params.crimeCount * 25 * severityMultiplier)));
  }

  // 3. Community reports factor: 20 pts per active (OPEN/VERIFIED) report up to 100
  const communityReportsFactor = clamp0to100(Math.min(100, params.reportsCount * 20));

  // 4. Estimated Night Footfall / Exposure Factor (Inverted):
  // Higher pedestrian footfall reduces isolation risk.
  // 100 footfall → 0 risk, 50 footfall → 50 risk, 10 footfall → 90 risk.
  const footfallRating =
    params.footfallRating !== undefined
      ? clamp0to100(params.footfallRating)
      : 50;
  const footfallExposureFactor = clamp0to100(100 - footfallRating);

  // 5. Recency factor: Higher risk if incidents happened recently
  let recencyFactor = 0;
  if (params.lastIncidentAgeHours !== undefined && params.lastIncidentAgeHours >= 0) {
    if (params.lastIncidentAgeHours <= 1) recencyFactor = 100;
    else if (params.lastIncidentAgeHours <= 6) recencyFactor = 80;
    else if (params.lastIncidentAgeHours <= 24) recencyFactor = 50;
    else if (params.lastIncidentAgeHours <= 72) recencyFactor = 25;
    else recencyFactor = 10;
  } else if (params.crimeCount > 0) {
    recencyFactor = 50;
  } else if (params.reportsCount > 0) {
    recencyFactor = 50;
  }

  return calculateRisk({
    crimeFactor,
    lightingRiskFactor: lightingFactor,
    communityReportsFactor,
    footfallExposureFactor,
    recencyFactor,
  });
}
