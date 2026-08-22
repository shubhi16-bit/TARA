import assert from 'assert';

function clamp0to100(val) {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.max(0, Math.min(100, Math.round(val)));
}

function categorizeRiskLevel(score) {
  const s = clamp0to100(score);
  if (s >= 80) return 'CRITICAL';
  if (s >= 60) return 'HIGH';
  if (s >= 30) return 'MODERATE';
  return 'LOW';
}

const RISK_WEIGHTS = {
  CRIME: 0.35,
  LIGHTING: 0.25,
  COMMUNITY_REPORTS: 0.15,
  FOOTFALL: 0.15,
  RECENCY: 0.10,
};

function calculateRisk(inputs) {
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

function calculateRoadRisk(params) {
  const lightingFactor =
    params.totalLights > 0
      ? clamp0to100(Math.round((params.faultyLights / params.totalLights) * 100))
      : 0;

  let crimeFactor = 0;
  if (params.crimeCount > 0) {
    let severityMultiplier = 1.0;
    if (params.highestCrimeSeverity === 'CRITICAL') severityMultiplier = 1.5;
    else if (params.highestCrimeSeverity === 'HIGH') severityMultiplier = 1.25;
    else if (params.highestCrimeSeverity === 'MODERATE') severityMultiplier = 1.0;
    else if (params.highestCrimeSeverity === 'LOW') severityMultiplier = 0.75;

    crimeFactor = clamp0to100(Math.min(100, Math.round(params.crimeCount * 25 * severityMultiplier)));
  }

  const communityReportsFactor = clamp0to100(Math.min(100, params.reportsCount * 20));

  const footfallRating =
    params.footfallRating !== undefined
      ? clamp0to100(params.footfallRating)
      : 50;
  const footfallExposureFactor = clamp0to100(100 - footfallRating);

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

function parseIncidentAgeHours(timeVal) {
  if (typeof timeVal === 'string') {
    const t = timeVal.toLowerCase().trim();
    if (t.includes('just now') || t.includes('sec')) return 0.1;
    const minMatch = t.match(/(\d+)\s*(?:min|mins|minute|minutes)/);
    if (minMatch) return parseInt(minMatch[1], 10) / 60;
    const hourMatch = t.match(/(\d+)\s*(?:hour|hours|hr|hrs)/);
    if (hourMatch) return parseInt(hourMatch[1], 10);
    const dayMatch = t.match(/(\d+)\s*(?:day|days)/);
    if (dayMatch) return parseInt(dayMatch[1], 10) * 24;
  }
  return undefined;
}

console.log("=========================================");
console.log("RUNNING TARA RISK ENGINE TEST SUITE");
console.log("=========================================");

// 1. All zero inputs → LOW / 0
const t1 = calculateRisk({ crimeFactor: 0, lightingRiskFactor: 0, communityReportsFactor: 0, footfallExposureFactor: 0, recencyFactor: 0 });
assert.strictEqual(t1.score, 0, "Test 1 failed: score should be 0");
assert.strictEqual(t1.riskLevel, 'LOW', "Test 1 failed: level should be LOW");
console.log("✓ Test 1: All zero inputs → LOW / 0");

// 2-8. Boundaries
assert.strictEqual(categorizeRiskLevel(0), 'LOW');
assert.strictEqual(categorizeRiskLevel(29), 'LOW');
assert.strictEqual(categorizeRiskLevel(30), 'MODERATE');
assert.strictEqual(categorizeRiskLevel(59), 'MODERATE');
assert.strictEqual(categorizeRiskLevel(60), 'HIGH');
assert.strictEqual(categorizeRiskLevel(79), 'HIGH');
assert.strictEqual(categorizeRiskLevel(80), 'CRITICAL');
assert.strictEqual(categorizeRiskLevel(100), 'CRITICAL');
console.log("✓ Tests 2-8: Boundary checks (0, 29, 30, 59, 60, 79, 80, 100)");

// 9-11. Clamping & NaN
assert.strictEqual(clamp0to100(-50), 0);
assert.strictEqual(clamp0to100(150), 100);
assert.strictEqual(clamp0to100(NaN), 0);
console.log("✓ Tests 9-11: Clamping below 0, above 100, and NaN handling");

// 12. Faulty light ratio
const t12 = calculateRoadRisk({ faultyLights: 5, totalLights: 10, crimeCount: 0, reportsCount: 0, footfallRating: 100 });
assert.strictEqual(t12.factors.lighting, 50);
const t12Zero = calculateRoadRisk({ faultyLights: 0, totalLights: 0, crimeCount: 0, reportsCount: 0, footfallRating: 100 });
assert.strictEqual(t12Zero.factors.lighting, 0);
console.log("✓ Test 12: Faulty streetlight ratio & 0 lights division protection");

// 13. Crime severity multiplier
const t13Crit = calculateRoadRisk({ faultyLights: 0, totalLights: 10, crimeCount: 1, highestCrimeSeverity: 'CRITICAL', reportsCount: 0, footfallRating: 100 });
assert.strictEqual(t13Crit.factors.crime, 38);
const t13Low = calculateRoadRisk({ faultyLights: 0, totalLights: 10, crimeCount: 1, highestCrimeSeverity: 'LOW', reportsCount: 0, footfallRating: 100 });
assert.strictEqual(t13Low.factors.crime, 19);
console.log("✓ Test 13: Crime severity multipliers (CRITICAL 1.5x, LOW 0.75x)");

// 14. Active report calculation
const t14One = calculateRoadRisk({ faultyLights: 0, totalLights: 10, crimeCount: 0, reportsCount: 1, footfallRating: 100 });
assert.strictEqual(t14One.factors.communityReports, 20);
const t14Six = calculateRoadRisk({ faultyLights: 0, totalLights: 10, crimeCount: 0, reportsCount: 6, footfallRating: 100 });
assert.strictEqual(t14Six.factors.communityReports, 100);
console.log("✓ Test 14: Active community reports scaling (20 pts per report)");

// 15. Recency calculation
const t15Recent = calculateRoadRisk({ faultyLights: 0, totalLights: 10, crimeCount: 1, reportsCount: 0, footfallRating: 100, lastIncidentAgeHours: 0.5 });
assert.strictEqual(t15Recent.factors.recency, 100);
const t15Med = calculateRoadRisk({ faultyLights: 0, totalLights: 10, crimeCount: 1, reportsCount: 0, footfallRating: 100, lastIncidentAgeHours: 12 });
assert.strictEqual(t15Med.factors.recency, 50);
console.log("✓ Test 15: Incident recency brackets");

// 16. Footfall inversion
const t16High = calculateRoadRisk({ faultyLights: 0, totalLights: 10, crimeCount: 0, reportsCount: 0, footfallRating: 90 });
assert.strictEqual(t16High.factors.footfall, 10);
const t16Low = calculateRoadRisk({ faultyLights: 0, totalLights: 10, crimeCount: 0, reportsCount: 0, footfallRating: 25 });
assert.strictEqual(t16Low.factors.footfall, 75);
console.log("✓ Test 16: Footfall inversion (90 footfall -> 10 risk, 25 footfall -> 75 risk)");

// 17. Complete road calculation
const complete = calculateRoadRisk({
  faultyLights: 4,
  totalLights: 10,
  crimeCount: 2,
  highestCrimeSeverity: 'HIGH',
  reportsCount: 2,
  footfallRating: 60,
  lastIncidentAgeHours: 2,
});
assert.strictEqual(complete.factors.crime, 63);
assert.strictEqual(complete.factors.lighting, 40);
assert.strictEqual(complete.factors.communityReports, 40);
assert.strictEqual(complete.factors.footfall, 40);
assert.strictEqual(complete.factors.recency, 80);
assert.strictEqual(complete.score, 52);
assert.strictEqual(complete.riskLevel, 'MODERATE');
console.log("✓ Test 17: Complete road calculation weighted verification (Score 52 / MODERATE)");

// 18. String incident parser
assert.strictEqual(Math.round(parseIncidentAgeHours('10 mins ago') * 60), 10);
assert.strictEqual(parseIncidentAgeHours('3 hours ago'), 3);
assert.strictEqual(parseIncidentAgeHours('2 days ago'), 48);
console.log("✓ Test 18: Incident string age parser");

console.log("=========================================");
console.log("ALL 18 RISK ENGINE TESTS PASSED WITH 0 ERRORS!");
console.log("=========================================");

