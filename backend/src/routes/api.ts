import { Router } from 'express';
import { db } from '../config/firebase';

const router = Router();

// Get all road segments
router.get('/roads', async (req, res) => {
  try {
    const snapshot = await db.collection('road_segments').get();
    const roads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(roads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roads' });
  }
});

// Get critical dark zones
router.get('/dark-zones', async (req, res) => {
  try {
    const snapshot = await db.collection('road_segments').where('risk_level', '==', 'CRITICAL').get();
    const zones = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dark zones' });
  }
});

// Get all streetlights
router.get('/streetlights', async (req, res) => {
  try {
    const snapshot = await db.collection('streetlights').get();
    const lights = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(lights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch streetlights' });
  }
});

// Update streetlight status (Firebase write)
router.put('/streetlights/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await db.collection('streetlights').doc(req.params.id).update({ status, updated_at: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update streetlight' });
  }
});

// Get reports
router.get('/reports', async (req, res) => {
  try {
    const snapshot = await db.collection('reports').get();
    const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Push Notification API (Mock Firebase FCM)
router.post('/notifications/send', async (req, res) => {
  try {
    const { title, body, topic, token } = req.body;
    // In production, use admin.messaging().send(...)
    // await admin.messaging().send({
    //   notification: { title, body },
    //   topic: topic || undefined,
    //   token: token || undefined,
    // });
    console.log(`[Notification Sent] To: ${topic || token} | Title: ${title}`);
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Mock Safe Route API
router.get('/routes/safe-route', (req, res) => {
  const { start_lat, start_lng, dest_lat, dest_lng } = req.query;
  
  if (!start_lat || !start_lng || !dest_lat || !dest_lng) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  // Mocking two routes for demonstration
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
