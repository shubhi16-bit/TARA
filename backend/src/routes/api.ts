import { Router } from 'express';
import multer from 'multer';
import { db, storage, adminApp } from '../config/firebase';
import { calculateRoadRisk, categorizeRiskLevel } from '../services/riskEngine';
import { calculateRoadNightExposure } from '../services/poiFootfallEngine';
import { syncDelhiPoliceCrimeData, fetchDelhiPolicePressReleases } from '../services/delhiPoliceScraper';

const router = Router();

// Multer memory storage for photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

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

/**
 * Helper to find nearest road and city based on coordinates
 */
async function findNearestRoad(lat: number, lng: number, fallbackCity: string = 'New Delhi') {
  try {
    if (!lat || !lng) return { nearestRoad: null, nearestCity: fallbackCity, minDistance: Infinity };

    const roadsSnap = await db.collection('roads').get();
    let roads = roadsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    if (roads.length === 0) {
      const segSnap = await db.collection('road_segments').get();
      roads = segSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    }

    let closestRoad: any = null;
    let minDistance = Infinity;

    for (const road of roads) {
      const coords = (road as any).coordinates || [];
      if (Array.isArray(coords) && coords.length > 0) {
        for (const pt of coords) {
          let pLat = 0;
          let pLng = 0;
          if (Array.isArray(pt)) {
            pLat = pt[0];
            pLng = pt[1];
          } else if (typeof pt === 'object' && pt !== null) {
            pLat = pt.lat || pt.latitude || 0;
            pLng = pt.lng || pt.longitude || 0;
          }
          if (pLat && pLng) {
            const d = Math.hypot(lat - pLat, lng - pLng);
            if (d < minDistance) {
              minDistance = d;
              closestRoad = road;
            }
          }
        }
      }
    }

    const nearestCity = closestRoad?.city || closestRoad?.cityId || fallbackCity;
    return { nearestRoad: closestRoad, nearestCity, minDistance };
  } catch (err) {
    console.warn('Error resolving nearest road:', err);
    return { nearestRoad: null, nearestCity: fallbackCity, minDistance: Infinity };
  }
}

// ----------------------------------------------------
// 1. CITIZEN REPORTS API (INFRASTRUCTURE ONLY)
// ----------------------------------------------------

/**
 * POST /api/reports
 * Create a new citizen infrastructure report with optional photo upload
 */
router.post('/reports', upload.single('photo'), async (req, res) => {
  try {
    const {
      userId,
      userPhone,
      phone,
      type,
      issueType,
      description,
      desc,
      notes,
      latitude,
      longitude,
      lat,
      lng,
      location,
      locationAddress,
      road: reqRoad,
      roadId: reqRoadId,
      roadName: reqRoadName,
      lightsDown,
      lightsCount,
      cityId,
      city,
      photoUrls = [],
      imageDataBase64,
      imageFilename,
    } = req.body;

    const reportLat = typeof latitude === 'string' ? parseFloat(latitude) : typeof latitude === 'number' ? latitude : typeof lat === 'number' ? lat : 28.6139;
    const reportLng = typeof longitude === 'string' ? parseFloat(longitude) : typeof longitude === 'number' ? longitude : typeof lng === 'number' ? lng : 77.2090;
    const reportNotes = notes || description || desc || 'Reported via TARA App';
    const reportType = issueType || type || 'Broken Streetlight';
    const reportUserId = userPhone || userId || phone || '+919876543210';
    const reportLocation = locationAddress || location || `GPS (${reportLat.toFixed(4)}, ${reportLng.toFixed(4)})`;

    let parsedLightsDown = 1;
    if (lightsDown !== undefined) parsedLightsDown = parseInt(lightsDown, 10) || 1;
    else if (lightsCount !== undefined) parsedLightsDown = parseInt(lightsCount, 10) || 1;
    else if (reportType.toLowerCase().includes('multiple')) parsedLightsDown = 3;

    // Resolve nearest road dynamically or prioritize explicit monitored road selection
    let resolvedRoadName = reqRoadName || reqRoad || '';
    let resolvedRoadId = reqRoadId || '';
    let resolvedCity = cityId || city || 'New Delhi';

    if (!resolvedRoadName || !resolvedRoadId) {
      const { nearestRoad, nearestCity, minDistance } = await findNearestRoad(reportLat, reportLng, resolvedCity);
      if (nearestRoad) {
        resolvedRoadName = resolvedRoadName || nearestRoad.name || nearestRoad.road_name || '';
        resolvedRoadId = resolvedRoadId || nearestRoad.id || '';
      }
      if (nearestCity) {
        resolvedCity = nearestCity;
      }
      console.log(`[GEO-RESOLVE] Nearest road calculated: ${resolvedRoadName} (${resolvedRoadId}) distance: ${minDistance}km`);
    } else {
      console.log(`[EXPLICIT-ROAD] Using explicit road selection: ${resolvedRoadName} (${resolvedRoadId})`);
    }

    const reportRef = db.collection('communityReports').doc();
    const reportId = reportRef.id;

    const finalPhotoUrls: string[] = Array.isArray(photoUrls) ? [...photoUrls] : (photoUrls ? [photoUrls] : []);

    // 1. If multipart file is attached in request, upload to Firebase Storage
    if (req.file) {
      try {
        const bucket = storage.bucket();
        const safeOriginalName = (req.file.originalname || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `photo_${Date.now()}_${safeOriginalName}`;
        const storagePath = `communityReports/${reportId}/${filename}`;
        const file = bucket.file(storagePath);

        await file.save(req.file.buffer, {
          metadata: { contentType: req.file.mimetype || 'image/jpeg' },
          public: true,
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
        finalPhotoUrls.push(publicUrl);
        console.log(`[STORAGE] Uploaded photo to Firebase Storage: ${publicUrl}`);
      } catch (storageErr) {
        console.warn('Firebase Storage upload warning (continuing with report creation):', storageErr);
      }
    }

    // 2. If Base64 image payload is supplied, upload to Firebase Storage
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

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
        finalPhotoUrls.push(publicUrl);
      } catch (storageErr) {
        console.warn('Firebase Storage Base64 upload warning:', storageErr);
      }
    }

    const riskRelevance = calculateRiskRelevance(reportType);

    const reportData = {
      id: reportId,
      reportId: reportId,
      userId: reportUserId,
      userPhone: reportUserId,
      type: reportType,
      issueType: reportType,
      desc: reportNotes,
      notes: reportNotes,
      lightsDown: parsedLightsDown,
      loc: [reportLat, reportLng],
      lat: reportLat,
      lng: reportLng,
      latitude: reportLat,
      longitude: reportLng,
      location: reportLocation,
      locationAddress: reportLocation,
      road: resolvedRoadName,
      roadName: resolvedRoadName,
      roadId: resolvedRoadId,
      cityId: resolvedCity,
      city: resolvedCity,
      timestamp: adminApp.firestore.FieldValue.serverTimestamp(),
      createdAt: adminApp.firestore.FieldValue.serverTimestamp(),
      updatedAt: adminApp.firestore.FieldValue.serverTimestamp(),
      photoUrls: finalPhotoUrls,
      photoUrl: finalPhotoUrls[0] || null,
      imageUrl: finalPhotoUrls[0] || null,
      verificationStatus: 'OPEN',
      adminNotes: '',
      status: 'logged',
      riskRelevance,
    };

    // Store ONLY in communityReports (NEVER touch crimeReports)
    await reportRef.set(reportData);

    console.log(`[TARA REPORT DEBUG]`);
    console.log(`Report ID: ${reportId}`);
    console.log(`Coordinates: (${reportLat}, ${reportLng})`);
    console.log(`City: ${resolvedCity}`);
    console.log(`Road: ${resolvedRoadName} (${resolvedRoadId})`);
    console.log(`Firestore ID: ${reportId}`);

    res.status(201).json({
      success: true,
      ...reportData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error creating citizen report:', error);
    res.status(500).json({ error: 'Failed to create report', details: error.message });
  }
});

/**
 * GET /api/reports
 * Fetch citizen reports from Firestore, supporting phone and city filtering
 */
router.get('/reports', async (req, res) => {
  try {
    const { phone, userPhone, userId, city } = req.query;
    const filterPhone = (phone || userPhone || userId) as string | undefined;

    let query: FirebaseFirestore.Query = db.collection('communityReports');

    if (city && typeof city === 'string') {
      query = query.where('city', '==', city);
    }

    const snapshot = await query.get();
    let reports = snapshot.docs.map((doc) => {
      const data = doc.data();
      const lat = data.latitude || (Array.isArray(data.loc) ? data.loc[0] : 0);
      const lng = data.longitude || (Array.isArray(data.loc) ? data.loc[1] : 0);
      const photoUrls = data.photoUrls || (data.photoUrl ? [data.photoUrl] : []);
      const imageUrl = data.imageUrl || (photoUrls.length > 0 ? photoUrls[0] : null);

      return {
        id: doc.id,
        issueType: data.issueType || data.type || 'Broken Streetlight',
        type: data.type || data.issueType || 'Community Report',
        location: data.location || data.locationAddress || (data.road ? `Near ${data.road}` : 'Pinned Location'),
        locationAddress: data.locationAddress || data.location || (data.road ? `Near ${data.road}` : 'Pinned Location'),
        latitude: typeof lat === 'number' ? lat : 28.6139,
        longitude: typeof lng === 'number' ? lng : 77.2090,
        notes: data.notes || data.desc || '',
        desc: data.desc || data.notes || '',
        lightsDown: data.lightsDown || 1,
        imageUrl: imageUrl,
        photoUrls: photoUrls,
        status: data.status || data.verificationStatus || 'logged',
        verificationStatus: data.verificationStatus || data.status || 'OPEN',
        createdAt: data.createdAt || (data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString()),
        userPhone: data.userPhone || data.userId || '',
        userId: data.userId || data.userPhone || '',
        road: data.road || '',
        roadId: data.roadId || '',
        city: data.city || data.cityId || 'New Delhi',
      };
    });

    if (filterPhone) {
      reports = reports.filter((r) => r.userPhone === filterPhone || r.userId === filterPhone);
    }

    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * PATCH /api/reports/:id/status
 * Update complaint lifecycle status (logged, inReview, inRepair, resolved, OPEN, VERIFIED, RESOLVED)
 */
router.patch('/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const updatePayload: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'resolved' || status === 'RESOLVED') {
      updatePayload.verificationStatus = 'RESOLVED';
    } else if (status === 'inReview' || status === 'inRepair' || status === 'VERIFIED') {
      updatePayload.verificationStatus = 'VERIFIED';
    }

    if (adminNotes !== undefined) {
      updatePayload.adminNotes = adminNotes;
    }

    const reportRef = db.collection('communityReports').doc(id);
    await reportRef.update(updatePayload);

    console.log(`[REPORT STATUS] Updated report ${id} to ${status}`);
    res.json({ success: true, id, status, updated: updatePayload });
  } catch (error: any) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Failed to update report status', details: error.message });
  }
});

/**
 * PATCH /api/reports/:id
 * General status update endpoint for Authority Dashboard
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
    await docRef.update(updatePayload);

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

// ----------------------------------------------------
// 2. DELHI POLICE CRIME SYNC API (SEPARATE FROM CITIZEN REPORTS)
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
    let lights = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
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
// 4. ROADS & LIVE OVERVIEWS
// ----------------------------------------------------

// Get all road segments
router.get('/roads', async (req, res) => {
  try {
    const snapshot = await db.collection('roads').get();
    let roads = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    if (roads.length === 0) {
      const segSnap = await db.collection('road_segments').get();
      roads = segSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
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

    const [roadsSnap, lightsSnap, crimesSnap, reportsSnap] = await Promise.all([
      db.collection('roads').get(),
      db.collection('streetlights').get(),
      db.collection('crimeReports').get(),
      db.collection('communityReports').get(),
    ]);

    let rawRoads = roadsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    if (rawRoads.length === 0) {
      const segSnap = await db.collection('road_segments').get();
      rawRoads = segSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    }

    const streetlights = lightsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const crimes = crimesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const reports = reportsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const filteredRoads = rawRoads.filter((r: any) => !city || !r.city || r.city.toLowerCase() === city.toLowerCase());
    const filteredLights = streetlights.filter((l: any) => !city || !l.city || l.city.toLowerCase() === city.toLowerCase());
    const filteredCrimes = crimes.filter((c: any) => !city || !c.city || c.city.toLowerCase() === city.toLowerCase());
    const filteredReports = reports.filter((r: any) => !city || !r.city || r.city.toLowerCase() === city.toLowerCase());

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

      const roadCoords = road.coordinates || (road.latitude && road.longitude ? [[road.latitude, road.longitude]] : []);
      const exposureFactors = calculateRoadNightExposure(roadCoords);
      const footfallRating = exposureFactors.totalNightExposure;

      const risk = calculateRoadRisk({
        faultyLights: faultyL,
        totalLights,
        crimeCount: road.crimeNearby || 0,
        reportsCount: matchingReports.length,
        footfallRating,
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
        nightExposure: footfallRating,
        exposureFactors,
        coordinates: roadCoords,
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

// ----------------------------------------------------
// 5. MOBILE CITIZEN APP COMPATIBILITY API
// ----------------------------------------------------

// Auth: Send OTP
router.post('/auth/send-otp', (req, res) => {
  const { phone } = req.body;
  console.log(`[AUTH] OTP requested for phone: ${phone}`);
  res.json({ success: true, message: 'OTP sent to mobile number', otpDemo: '123456' });
});

// Auth: Verify OTP
router.post('/auth/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  console.log(`[AUTH] Verifying OTP ${otp} for phone: ${phone}`);
  res.json({
    success: true,
    token: `jwt_token_${Date.now()}`,
    user: { phone, name: 'TARA Citizen' },
  });
});

// Dark Zones: Get All Active Dark Corridors for Mobile App
router.get('/dark-zones', async (req, res) => {
  try {
    const [roadsSnap, lightsSnap] = await Promise.all([
      db.collection('roads').get(),
      db.collection('streetlights').get(),
    ]);

    let rawRoads = roadsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    if (rawRoads.length === 0) {
      const segSnap = await db.collection('road_segments').get();
      rawRoads = segSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    }

    const lights = lightsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const darkZones = rawRoads.map((road: any, idx: number) => {
      const matchingLights = lights.filter(
        (l: any) => l.road && l.road.toLowerCase() === (road.name || road.road_name || '').toLowerCase()
      );
      const faultyLights = matchingLights.filter((l: any) => l.status === 'faulty' || l.status === 'broken').length;
      const totalLights = matchingLights.length > 0 ? matchingLights.length : (road.totalLights || 10);
      const workingLights = Math.max(0, totalLights - faultyLights);

      let lat = 28.6139 + idx * 0.002;
      let lng = 77.2090 + idx * 0.002;
      if (Array.isArray(road.coordinates) && road.coordinates.length > 0) {
        const pt = road.coordinates[0];
        if (Array.isArray(pt)) {
          lat = pt[0];
          lng = pt[1];
        } else if (typeof pt === 'object') {
          lat = pt.lat || pt.latitude || lat;
          lng = pt.lng || pt.longitude || lng;
        }
      }

      const score = typeof road.score === 'number' ? road.score : 65;
      const level = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';

      return {
        id: `DZ-${road.id}`,
        roadName: road.name || road.road_name || `Road ${road.id}`,
        latitude: lat,
        longitude: lng,
        riskLevel: level,
        riskScore: score,
        totalLights,
        workingLights,
        faultyLights,
        estimatedFootfall: (road.nightExposure || 50) > 60 ? 'High' : (road.nightExposure || 50) > 30 ? 'Moderate' : 'Low',
        activeReports: road.reports || 0,
      };
    });

    res.json(darkZones);
  } catch (error) {
    console.error('Error generating dark zones:', error);
    res.status(500).json({ error: 'Failed to fetch dark zones' });
  }
});

// Safe Route API
router.get('/routes/safe-route', (req, res) => {
  const { start_lat, start_lng, dest_lat, dest_lng } = req.query;

  if (!start_lat || !start_lng || !dest_lat || !dest_lng) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  const sLat = parseFloat(start_lat as string) || 28.6139;
  const sLng = parseFloat(start_lng as string) || 77.2090;
  const dLat = parseFloat(dest_lat as string) || 28.6250;
  const dLng = parseFloat(dest_lng as string) || 77.2180;

  const routeA = {
    id: 'route_standard',
    name: 'Direct Route (High Dark Zones)',
    distance_km: 1.8,
    duration_min: 14,
    risk_score: 78,
    risk_level: 'HIGH',
    geometry: [
      [sLat, sLng],
      [(sLat + dLat) / 2, (sLng + dLng) / 2],
      [dLat, dLng],
    ],
    recommended: false,
  };

  const routeB = {
    id: 'route_safe',
    name: 'TARA Well-Lit Safest Route',
    distance_km: 2.1,
    duration_min: 17,
    risk_score: 28,
    risk_level: 'LOW',
    geometry: [
      [sLat, sLng],
      [sLat + 0.003, sLng + 0.001],
      [(sLat + dLat) / 2 + 0.002, (sLng + dLng) / 2 - 0.001],
      [dLat, dLng],
    ],
    recommended: true,
  };

  res.json({
    recommended_route: routeB,
    alternatives: [routeA],
  });
});

export default router;
