import { Router } from 'express';
import { db, storage, adminApp } from '../config/firebase';
import { calculateRoadRisk, categorizeRiskLevel } from '../services/riskEngine';
import { syncDelhiPoliceCrimeData, fetchDelhiPolicePressReleases } from '../services/delhiPoliceScraper';

const router = Router();

function calculateRiskRelevance(type: string): number {
  const t = (type || '').toLowerCase();
  if (t.includes('assault') || t.includes('violence') || t.includes('harassment') || t.includes('stalking')) {
    return 85;
  }
  if (t.includes('dark') || t.includes('unlit')) {
    return 65;
  }
  if (t.includes('broken') || t.includes('faulty') || t.includes('light')) {
    return 45;
  }
  if (t.includes('suspicious')) {
    return 50;
  }
  return 30;
}

// ----------------------------------------------------
// 1. CITIZEN REPORTS API
// ----------------------------------------------------

/**
 * POST /api/reports
 * Create a new citizen community report
 */
router.post('/reports', async (req, res) => {
  try {
    const {
      userId,
      type,
      description,
      desc,
      latitude,
      longitude,
      lat,
      lng,
      cityId,
      city,
      photoUrls = [],
      imageDataBase64,
      imageFilename,
    } = req.body;

    const reportLat = typeof latitude === 'number' ? latitude : typeof lat === 'number' ? lat : 0;
    const reportLng = typeof longitude === 'number' ? longitude : typeof lng === 'number' ? lng : 0;
    const reportDesc = description || desc || '';
    const reportType = type || 'Community Incident';
    const reportCity = cityId || city || 'New Delhi';
    const reportUserId = userId || 'citizen_user';

    const reportRef = db.collection('communityReports').doc();
    const reportId = reportRef.id;

    const finalPhotoUrls: string[] = Array.isArray(photoUrls) ? [...photoUrls] : (photoUrls ? [photoUrls] : []);

    // If Base64 image payload is supplied, upload to Firebase Storage
    if (imageDataBase64) {
      try {
        const bucket = storage.bucket();
        const filename = imageFilename || `photo_${Date.now()}.jpg`;
        const storagePath = `communityReports/${reportId}/${filename}`;
        const file = bucket.file(storagePath);

        const base64Data = imageDataBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        await file.save(buffer, {
          metadata: { contentType: 'image/jpeg' },
          public: true,
        });

        // Store public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
        finalPhotoUrls.push(publicUrl);
      } catch (storageErr) {
        console.warn('Firebase Storage upload warning (falling back to direct photoUrls):', storageErr);
      }
    }

    const riskRelevance = calculateRiskRelevance(reportType);

    const reportData = {
      id: reportId,
      userId: reportUserId,
      type: reportType,
      desc: reportDesc,
      loc: [reportLat, reportLng],
      latitude: reportLat,
      longitude: reportLng,
      cityId: reportCity,
      city: reportCity,
      timestamp: adminApp.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
      photoUrls: finalPhotoUrls,
      verificationStatus: 'OPEN' as const,
      adminNotes: '',
      status: 'OPEN' as const,
      riskRelevance,
    };

    await reportRef.set(reportData);

    res.status(201).json({
      success: true,
      id: reportId,
      report: {
        ...reportData,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report', details: error.message });
  }
});

/**
 * PATCH /api/reports/:id
 * Authority status update: OPEN | VERIFIED | RESOLVED + adminNotes
 */
router.patch('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verificationStatus, adminNotes } = req.body;

    const newStatus = status || verificationStatus;
    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (newStatus) {
      updatePayload.status = newStatus;
      updatePayload.verificationStatus = newStatus;
    }
    if (adminNotes !== undefined) {
      updatePayload.adminNotes = adminNotes;
    }

    const docRef = db.collection('communityReports').doc(id);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      await docRef.update(updatePayload);
    } else {
      // Fallback check in 'reports' collection
      const fallbackRef = db.collection('reports').doc(id);
      await fallbackRef.update(updatePayload);
    }

    res.json({
      success: true,
      id,
      updated: updatePayload,
    });
  } catch (error: any) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report', details: error.message });
  }
});

/**
 * GET /api/reports
 * Fetch reports, optionally filtered by city
 */
router.get('/reports', async (req, res) => {
  try {
    const { city } = req.query;
    let query: FirebaseFirestore.Query = db.collection('communityReports');

    if (city && typeof city === 'string') {
      query = query.where('city', '==', city);
    }

    const snapshot = await query.get();
    let reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (reports.length === 0) {
      // Check fallback 'reports' collection
      const fallbackSnap = await db.collection('reports').get();
      reports = fallbackSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (city && typeof city === 'string') {
        reports = reports.filter((r: any) => !r.city || r.city.toLowerCase() === city.toLowerCase());
      }
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// ----------------------------------------------------
// 2. DELHI POLICE CRIME SYNC API
// ----------------------------------------------------

/**
 * POST /api/crimes/sync-delhi-police
 * Manually trigger fetching & ingestion of official Delhi Police press releases
 */
router.post('/crimes/sync-delhi-police', async (req, res) => {
  try {
    const result = await syncDelhiPoliceCrimeData();
    res.json(result);
  } catch (error: any) {
    console.error('Error syncing Delhi Police data:', error);
    res.status(500).json({ error: 'Failed to sync Delhi Police crime data', details: error.message });
  }
});

/**
 * GET /api/crimes/sync-delhi-police
 * Convenient GET trigger for manual sync / testing
 */
router.get('/crimes/sync-delhi-police', async (req, res) => {
  try {
    const result = await syncDelhiPoliceCrimeData();
    res.json(result);
  } catch (error: any) {
    console.error('Error syncing Delhi Police data:', error);
    res.status(500).json({ error: 'Failed to sync Delhi Police crime data', details: error.message });
  }
});

/**
 * GET /api/crimes/delhi-police
 * Inspect current Delhi Police press releases without saving
 */
router.get('/crimes/delhi-police', async (req, res) => {
  try {
    const releases = await fetchDelhiPolicePressReleases();
    res.json({ total: releases.length, releases });
  } catch (error: any) {
    console.error('Error fetching Delhi Police data:', error);
    res.status(500).json({ error: 'Failed to fetch Delhi Police press releases', details: error.message });
  }
});

// ----------------------------------------------------
// 3. STREETLIGHTS API
// ----------------------------------------------------

// Get all streetlights
router.get('/streetlights', async (req, res) => {
  try {
    const { city } = req.query;
    const snapshot = await db.collection('streetlights').get();
    let lights = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (city && typeof city === 'string') {
      lights = lights.filter((l: any) => !l.city || l.city.toLowerCase() === city.toLowerCase());
    }
    res.json(lights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch streetlights' });
  }
});

// Update streetlight status (PATCH or PUT)
router.patch('/streetlights/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await db.collection('streetlights').doc(req.params.id).update({
      status,
      updated_at: new Date(),
    });
    res.json({ success: true, id: req.params.id, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update streetlight' });
  }
});

router.put('/streetlights/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await db.collection('streetlights').doc(req.params.id).update({
      status,
      updated_at: new Date(),
    });
    res.json({ success: true, id: req.params.id, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update streetlight' });
  }
});

// ----------------------------------------------------
// 3. ROADS & LIVE OVERVIEWS
// ----------------------------------------------------

// Get all road segments
router.get('/roads', async (req, res) => {
  try {
    const snapshot = await db.collection('roads').get();
    let roads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (roads.length === 0) {
      const segSnap = await db.collection('road_segments').get();
      roads = segSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    res.json(roads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roads' });
  }
});

// Live Map overview endpoint
router.get('/map/overview', async (req, res) => {
  try {
    const city = (req.query.city as string) || 'New Delhi';

    // Fetch roads, streetlights, crimes, reports in parallel
    const [roadsSnap, lightsSnap, crimesSnap, reportsSnap] = await Promise.all([
      db.collection('roads').get(),
      db.collection('streetlights').get(),
      db.collection('crimeReports').get(),
      db.collection('communityReports').get(),
    ]);

    let rawRoads = roadsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (rawRoads.length === 0) {
      const segSnap = await db.collection('road_segments').get();
      rawRoads = segSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    const streetlights = lightsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const crimes = crimesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const reports = reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Filter by city
    const filteredRoads = rawRoads.filter((r: any) => !city || !r.city || r.city.toLowerCase() === city.toLowerCase());
    const filteredLights = streetlights.filter((l: any) => !city || !l.city || l.city.toLowerCase() === city.toLowerCase());
    const filteredCrimes = crimes.filter((c: any) => !city || !c.city || c.city.toLowerCase() === city.toLowerCase());
    const filteredReports = reports.filter((r: any) => !city || !r.city || r.city.toLowerCase() === city.toLowerCase());

    // Compute deterministic risk for roads
    const enrichedRoads = filteredRoads.map((road: any) => {
      const matchingLights = filteredLights.filter(
        (l: any) => (l.road && l.road.toLowerCase() === (road.name || road.road_name || '').toLowerCase())
      );
      const faultyCount = matchingLights.filter((l: any) => l.status === 'faulty' || l.status === 'broken').length;
      const totalLights = matchingLights.length > 0 ? matchingLights.length : road.totalLights || 10;
      const faultyL = matchingLights.length > 0 ? faultyCount : road.faultyLights || 0;

      const matchingReports = filteredReports.filter(
        (r: any) => r.desc && r.desc.toLowerCase().includes((road.name || road.road_name || '').toLowerCase())
      );

      const risk = calculateRoadRisk({
        faultyLights: faultyL,
        totalLights,
        crimeCount: road.crimeNearby || 0,
        reportsCount: matchingReports.length,
        footfallRating: road.nightExposure || 45,
      });

      const score = road.score > 0 && risk.score === 0 ? road.score : risk.score;
      return {
        id: road.id,
        name: road.name || road.road_name || 'Segment ' + road.id,
        score,
        riskLevel: categorizeRiskLevel(score),
        factors: risk.factors,
        faultyLights: faultyL,
        totalLights,
        crimeNearby: road.crimeNearby || 0,
        reports: matchingReports.length,
        nightExposure: road.nightExposure || 45,
        coordinates: road.coordinates || (road.latitude && road.longitude ? [[road.latitude, road.longitude]] : []),
      };
    });

    res.json({
      roads: enrichedRoads,
      crimes: filteredCrimes,
      streetlights: filteredLights,
      reports: filteredReports,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate map overview' });
  }
});

// Mock Safe Route API
router.get('/routes/safe-route', (req, res) => {
  const { start_lat, start_lng, dest_lat, dest_lng } = req.query;

  if (!start_lat || !start_lng || !dest_lat || !dest_lng) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  const routeA = {
    id: 'route_a',
    distance_km: 1.8,
    duration_min: 14,
    risk_score: 82,
    risk_level: 'HIGH',
    geometry: [
      [28.6139, 77.2090],
      [28.6145, 77.2095],
      [28.6150, 77.2100],
    ],
    recommended: false,
  };

  const routeB = {
    id: 'route_b',
    distance_km: 2.1,
    duration_min: 17,
    risk_score: 31,
    risk_level: 'LOW',
    geometry: [
      [28.6139, 77.2090],
      [28.6140, 77.2075],
      [28.6150, 77.2100],
    ],
    recommended: true,
  };

  res.json({
    recommended_route: routeB,
    alternatives: [routeA],
  });
});

export default router;
