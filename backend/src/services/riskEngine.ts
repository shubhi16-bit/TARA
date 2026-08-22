interface RiskFactors {
  lightingRisk: number;       // 0-100
  historicalCrime: number;    // 0-100
  pedestrianExposure: number; // 0-100
  communityReports: number;   // 0-100
}

interface RiskResult {
  overallScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

const WEIGHTS = {
  LIGHTING: 0.35,
  CRIME: 0.25,
  PEDESTRIAN: 0.25,
  REPORTS: 0.15,
};

export function calculateRiskScore(factors: RiskFactors): RiskResult {
  const overallScore =
    factors.lightingRisk * WEIGHTS.LIGHTING +
    factors.historicalCrime * WEIGHTS.CRIME +
    factors.pedestrianExposure * WEIGHTS.PEDESTRIAN +
    factors.communityReports * WEIGHTS.REPORTS;

  const roundedScore = Math.round(overallScore * 100) / 100;

  let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (roundedScore > 75) {
    riskLevel = 'CRITICAL';
  } else if (roundedScore > 55) {
    riskLevel = 'HIGH';
  } else if (roundedScore > 30) {
    riskLevel = 'MODERATE';
  }

  return {
    overallScore: roundedScore,
    riskLevel,
  };
}
