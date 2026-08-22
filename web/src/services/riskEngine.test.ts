import {
  clamp0to100,
  categorizeRiskLevel,
  calculateRisk,
  calculateRoadRisk,
  parseIncidentAgeHours,
} from './riskEngine';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

export function runRiskEngineTests() {
  // 1. All zero inputs → LOW / 0
  const res = calculateRisk({
    crimeFactor: 0,
    lightingRiskFactor: 0,
    communityReportsFactor: 0,
    footfallExposureFactor: 0,
    recencyFactor: 0,
  });
  assert(res.score === 0, 'all zeros score should be 0');
  assert(res.riskLevel === 'LOW', 'all zeros riskLevel should be LOW');

  // 2-8. Score boundary tests
  assert(categorizeRiskLevel(0) === 'LOW', '0 is LOW');
  assert(categorizeRiskLevel(29) === 'LOW', '29 is LOW');
  assert(categorizeRiskLevel(30) === 'MODERATE', '30 is MODERATE');
  assert(categorizeRiskLevel(59) === 'MODERATE', '59 is MODERATE');
  assert(categorizeRiskLevel(60) === 'HIGH', '60 is HIGH');
  assert(categorizeRiskLevel(79) === 'HIGH', '79 is HIGH');
  assert(categorizeRiskLevel(80) === 'CRITICAL', '80 is CRITICAL');
  assert(categorizeRiskLevel(100) === 'CRITICAL', '100 is CRITICAL');

  // 9-11. Clamping & NaN handling
  assert(clamp0to100(-50) === 0, '-50 clamps to 0');
  assert(clamp0to100(150) === 100, '150 clamps to 100');
  assert(clamp0to100(NaN) === 0, 'NaN clamps to 0');
  assert(clamp0to100(undefined as any) === 0, 'undefined clamps to 0');

  // 12. Faulty light ratio calculation
  const resLight = calculateRoadRisk({
    faultyLights: 5,
    totalLights: 10,
    crimeCount: 0,
    reportsCount: 0,
    footfallRating: 100,
  });
  assert(resLight.factors.lighting === 50, '5/10 lights should be 50%');

  const resZeroLight = calculateRoadRisk({
    faultyLights: 0,
    totalLights: 0,
    crimeCount: 0,
    reportsCount: 0,
    footfallRating: 100,
  });
  assert(resZeroLight.factors.lighting === 0, '0 total lights should be 0%');

  // 13. Crime severity multiplier
  const crit = calculateRoadRisk({
    faultyLights: 0,
    totalLights: 10,
    crimeCount: 1,
    highestCrimeSeverity: 'CRITICAL',
    reportsCount: 0,
    footfallRating: 100,
  });
  assert(crit.factors.crime === 38, '1 critical crime factor should be 38');

  const low = calculateRoadRisk({
    faultyLights: 0,
    totalLights: 10,
    crimeCount: 1,
    highestCrimeSeverity: 'LOW',
    reportsCount: 0,
    footfallRating: 100,
  });
  assert(low.factors.crime === 19, '1 low crime factor should be 19');

  // 14. Active report calculation
  const oneReport = calculateRoadRisk({
    faultyLights: 0,
    totalLights: 10,
    crimeCount: 0,
    reportsCount: 1,
    footfallRating: 100,
  });
  assert(oneReport.factors.communityReports === 20, '1 report should be 20');

  const sixReports = calculateRoadRisk({
    faultyLights: 0,
    totalLights: 10,
    crimeCount: 0,
    reportsCount: 6,
    footfallRating: 100,
  });
  assert(sixReports.factors.communityReports === 100, '6 reports should be 100');

  // 15. Recency calculation
  const oneHr = calculateRoadRisk({
    faultyLights: 0,
    totalLights: 10,
    crimeCount: 1,
    reportsCount: 0,
    footfallRating: 100,
    lastIncidentAgeHours: 0.5,
  });
  assert(oneHr.factors.recency === 100, '<=1hr recency should be 100');

  const fourHr = calculateRoadRisk({
    faultyLights: 0,
    totalLights: 10,
    crimeCount: 1,
    reportsCount: 0,
    footfallRating: 100,
    lastIncidentAgeHours: 4,
  });
  assert(fourHr.factors.recency === 80, '4hr recency should be 80');

  // 16. Footfall inversion
  const highFootfall = calculateRoadRisk({
    faultyLights: 0,
    totalLights: 10,
    crimeCount: 0,
    reportsCount: 0,
    footfallRating: 90,
  });
  assert(highFootfall.factors.footfall === 10, '90 footfall should be 10 risk');

  const lowFootfall = calculateRoadRisk({
    faultyLights: 0,
    totalLights: 10,
    crimeCount: 0,
    reportsCount: 0,
    footfallRating: 25,
  });
  assert(lowFootfall.factors.footfall === 75, '25 footfall should be 75 risk');

  // 17. Complete weighted road risk calculation
  const complete = calculateRoadRisk({
    faultyLights: 4,
    totalLights: 10,
    crimeCount: 2,
    highestCrimeSeverity: 'HIGH',
    reportsCount: 2,
    footfallRating: 60,
    lastIncidentAgeHours: 2,
  });
  assert(complete.factors.crime === 63, 'crime factor should be 63');
  assert(complete.factors.lighting === 40, 'lighting factor should be 40');
  assert(complete.factors.communityReports === 40, 'reports factor should be 40');
  assert(complete.factors.footfall === 40, 'footfall risk should be 40');
  assert(complete.factors.recency === 80, 'recency factor should be 80');
  assert(complete.score === 52, 'score should be 52');
  assert(complete.riskLevel === 'MODERATE', 'riskLevel should be MODERATE');

  // 18. Incident string age parser
  assert(Math.round((parseIncidentAgeHours('10 mins ago') || 0) * 60) === 10, '10 mins age parser');
  assert(parseIncidentAgeHours('3 hours ago') === 3, '3 hours age parser');
  assert(parseIncidentAgeHours('2 days ago') === 48, '2 days age parser');

  return true;
}

