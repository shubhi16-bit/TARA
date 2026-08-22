import * as admin from 'firebase-admin';
import { calculateRisk } from '../src/services/riskEngine';

// Make sure to set GOOGLE_APPLICATION_CREDENTIALS before running
admin.initializeApp();
const db = admin.firestore();

const areas = [
  { id: 'area1', name: 'Downtown', city: 'Metropolis', population_estimate: 50000 },
  { id: 'area2', name: 'Northside', city: 'Metropolis', population_estimate: 30000 },
];

const roadSegments = [
  {
    id: 'road1',
    area_id: 'area1',
    road_name: 'College Road',
    latitude: 28.6139,
    longitude: 77.2090,
    length_meters: 1800,
    pedestrian_exposure_score: 90,
    lighting_score: 82, // High lighting risk (bad lights)
    crime_score: 65,
    community_report_score: 70,
  },
  {
    id: 'road2',
    area_id: 'area1',
    road_name: 'Station Road',
    latitude: 28.6149,
    longitude: 77.2080,
    length_meters: 2100,
    pedestrian_exposure_score: 85,
    lighting_score: 30, // Low risk
    crime_score: 20,
    community_report_score: 10,
  },
];

async function seed() {
  console.log('Seeding areas...');
  for (const area of areas) {
    await db.collection('areas').doc(area.id).set(area);
  }

  console.log('Seeding roads...');
  for (const road of roadSegments) {
    const risk = calculateRisk({
      lightingRiskFactor: road.lighting_score,
      crimeFactor: road.crime_score,
      footfallExposureFactor: road.pedestrian_exposure_score,
      communityReportsFactor: road.community_report_score,
      recencyFactor: 50,
    });
    
    await db.collection('road_segments').doc(road.id).set({
      ...road,
      overall_risk_score: risk.score,
      risk_level: risk.riskLevel,
      risk_factors: risk.factors,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log('Seeding complete.');
}

seed().catch(console.error);
