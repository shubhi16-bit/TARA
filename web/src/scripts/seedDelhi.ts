import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCc2l1aaywbwqwnB-2TYu0iNaJLdH2eImI",
  authDomain: "tara-3b146.firebaseapp.com",
  projectId: "tara-3b146",
  storageBucket: "tara-3b146.firebasestorage.app",
  messagingSenderId: "536025525990",
  appId: "1:536025525990:web:301fd53a0bc09b94a31527"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CITY_ID = "New Delhi";

// ------------------------------------------------------------------
// 1. CITIES
// ------------------------------------------------------------------
const cities = [
  {
    id: "city_new_delhi",
    name: "New Delhi",
    cityId: CITY_ID,
    center: [28.6315, 77.2190],
    zoom: 14,
    state: "Delhi",
    country: "India",
    totalRoads: 10,
  }
];

// ------------------------------------------------------------------
// 2. ROADS (10 specific roads in Central/New Delhi)
// ------------------------------------------------------------------
const roads = [
  {
    id: "r1_barakhamba",
    name: "Barakhamba Road",
    city: CITY_ID,
    cityId: CITY_ID,
    score: 28,
    safetyScore: 72,
    riskLevel: "LOW",
    faultyLights: 1,
    totalLights: 8,
    crimeNearby: 0,
    reports: 2,
    nightExposure: 72,
    coordinates: [
      [28.6315, 77.2197],
      [28.6310, 77.2220],
      [28.6304, 77.2245],
      [28.6297, 77.2270],
      [28.6290, 77.2295],
    ],
  },
  {
    id: "r2_janpath",
    name: "Janpath",
    city: CITY_ID,
    cityId: CITY_ID,
    score: 72,
    safetyScore: 28,
    riskLevel: "HIGH",
    faultyLights: 5,
    totalLights: 10,
    crimeNearby: 2,
    reports: 8,
    nightExposure: 38,
    coordinates: [
      [28.6315, 77.2197],
      [28.6300, 77.2195],
      [28.6285, 77.2192],
      [28.6268, 77.2190],
      [28.6250, 77.2187],
    ],
  },
  {
    id: "r3_sansad",
    name: "Sansad Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    score: 58,
    safetyScore: 42,
    riskLevel: "MODERATE",
    faultyLights: 3,
    totalLights: 9,
    crimeNearby: 1,
    reports: 5,
    nightExposure: 52,
    coordinates: [
      [28.6315, 77.2197],
      [28.6305, 77.2178],
      [28.6293, 77.2158],
      [28.6280, 77.2138],
      [28.6268, 77.2118],
    ],
  },
  {
    id: "r4_bks",
    name: "Baba Kharak Singh Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    score: 85,
    safetyScore: 15,
    riskLevel: "CRITICAL",
    faultyLights: 7,
    totalLights: 10,
    crimeNearby: 3,
    reports: 12,
    nightExposure: 24,
    coordinates: [
      [28.6339, 77.2168],
      [28.6344, 77.2157],
      [28.6350, 77.2145],
      [28.6357, 77.2135],
      [28.6364, 77.2128],
    ],
  },
  {
    id: "r5_kg_marg",
    name: "Kasturba Gandhi Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    score: 45,
    safetyScore: 55,
    riskLevel: "MODERATE",
    faultyLights: 2,
    totalLights: 12,
    crimeNearby: 0,
    reports: 3,
    nightExposure: 66,
    coordinates: [
      [28.6315, 77.2197],
      [28.6330, 77.2195],
      [28.6345, 77.2192],
      [28.6360, 77.2190],
    ],
  },
  {
    id: "r6_tolstoy",
    name: "Tolstoy Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    score: 22,
    safetyScore: 78,
    riskLevel: "LOW",
    faultyLights: 0,
    totalLights: 8,
    crimeNearby: 0,
    reports: 1,
    nightExposure: 81,
    coordinates: [
      [28.6315, 77.2197],
      [28.6328, 77.2210],
      [28.6340, 77.2225],
      [28.6352, 77.2240],
    ],
  },
  {
    id: "r7_minto",
    name: "Minto Road",
    city: CITY_ID,
    cityId: CITY_ID,
    score: 65,
    safetyScore: 35,
    riskLevel: "HIGH",
    faultyLights: 4,
    totalLights: 8,
    crimeNearby: 1,
    reports: 6,
    nightExposure: 41,
    coordinates: [
      [28.6290, 77.2295],
      [28.6278, 77.2285],
      [28.6268, 77.2270],
    ],
  },
  {
    id: "r8_ashoka",
    name: "Ashoka Road",
    city: CITY_ID,
    cityId: CITY_ID,
    score: 38,
    safetyScore: 62,
    riskLevel: "MODERATE",
    faultyLights: 1,
    totalLights: 6,
    crimeNearby: 0,
    reports: 2,
    nightExposure: 69,
    coordinates: [
      [28.6250, 77.2187],
      [28.6248, 77.2165],
      [28.6250, 77.2142],
    ],
  },
  {
    id: "r9_panchkuian",
    name: "Panchkuian Road",
    city: CITY_ID,
    cityId: CITY_ID,
    score: 91,
    safetyScore: 9,
    riskLevel: "CRITICAL",
    faultyLights: 8,
    totalLights: 10,
    crimeNearby: 2,
    reports: 15,
    nightExposure: 19,
    coordinates: [
      [28.6462, 77.2058],
      [28.6448, 77.2070],
      [28.6432, 77.2084],
      [28.6417, 77.2097],
      [28.6401, 77.2110],
    ],
  },
  {
    id: "r10_connaught_lane",
    name: "Connaught Lane",
    city: CITY_ID,
    cityId: CITY_ID,
    score: 15,
    safetyScore: 85,
    riskLevel: "LOW",
    faultyLights: 0,
    totalLights: 6,
    crimeNearby: 0,
    reports: 0,
    nightExposure: 88,
    coordinates: [
      [28.6360, 77.2190],
      [28.6358, 77.2210],
      [28.6352, 77.2240],
    ],
  },
];

// ------------------------------------------------------------------
// 3. STREETLIGHTS (32 distributed across the 10 roads)
// ------------------------------------------------------------------
const streetlights = [
  // Baba Kharak Singh Marg (faulty lights: 7)
  { id: "sl_bks_1", road: "Baba Kharak Singh Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6339, lng: 77.2168, loc: [28.6339, 77.2168], status: "faulty" },
  { id: "sl_bks_2", road: "Baba Kharak Singh Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6344, lng: 77.2157, loc: [28.6344, 77.2157], status: "faulty" },
  { id: "sl_bks_3", road: "Baba Kharak Singh Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6350, lng: 77.2145, loc: [28.6350, 77.2145], status: "broken" },
  { id: "sl_bks_4", road: "Baba Kharak Singh Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6357, lng: 77.2135, loc: [28.6357, 77.2135], status: "working" },

  // Panchkuian Road (faulty lights: 8)
  { id: "sl_panch_1", road: "Panchkuian Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6462, lng: 77.2058, loc: [28.6462, 77.2058], status: "faulty" },
  { id: "sl_panch_2", road: "Panchkuian Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6448, lng: 77.2070, loc: [28.6448, 77.2070], status: "broken" },
  { id: "sl_panch_3", road: "Panchkuian Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6432, lng: 77.2084, loc: [28.6432, 77.2084], status: "faulty" },
  { id: "sl_panch_4", road: "Panchkuian Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6417, lng: 77.2097, loc: [28.6417, 77.2097], status: "working" },

  // Janpath (faulty lights: 5)
  { id: "sl_jan_1", road: "Janpath", city: CITY_ID, cityId: CITY_ID, lat: 28.6315, lng: 77.2197, loc: [28.6315, 77.2197], status: "faulty" },
  { id: "sl_jan_2", road: "Janpath", city: CITY_ID, cityId: CITY_ID, lat: 28.6285, lng: 77.2192, loc: [28.6285, 77.2192], status: "faulty" },
  { id: "sl_jan_3", road: "Janpath", city: CITY_ID, cityId: CITY_ID, lat: 28.6268, lng: 77.2190, loc: [28.6268, 77.2190], status: "working" },
  { id: "sl_jan_4", road: "Janpath", city: CITY_ID, cityId: CITY_ID, lat: 28.6250, lng: 77.2187, loc: [28.6250, 77.2187], status: "working" },

  // Minto Road (faulty lights: 4)
  { id: "sl_min_1", road: "Minto Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6290, lng: 77.2295, loc: [28.6290, 77.2295], status: "faulty" },
  { id: "sl_min_2", road: "Minto Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6278, lng: 77.2285, loc: [28.6278, 77.2285], status: "broken" },
  { id: "sl_min_3", road: "Minto Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6268, lng: 77.2270, loc: [28.6268, 77.2270], status: "working" },

  // Sansad Marg (faulty lights: 3)
  { id: "sl_san_1", road: "Sansad Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6315, lng: 77.2197, loc: [28.6315, 77.2197], status: "faulty" },
  { id: "sl_san_2", road: "Sansad Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6293, lng: 77.2158, loc: [28.6293, 77.2158], status: "working" },
  { id: "sl_san_3", road: "Sansad Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6268, lng: 77.2118, loc: [28.6268, 77.2118], status: "working" },

  // Kasturba Gandhi Marg (faulty lights: 2)
  { id: "sl_kg_1", road: "Kasturba Gandhi Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6315, lng: 77.2197, loc: [28.6315, 77.2197], status: "faulty" },
  { id: "sl_kg_2", road: "Kasturba Gandhi Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6330, lng: 77.2195, loc: [28.6330, 77.2195], status: "working" },
  { id: "sl_kg_3", road: "Kasturba Gandhi Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6345, lng: 77.2192, loc: [28.6345, 77.2192], status: "working" },
  { id: "sl_kg_4", road: "Kasturba Gandhi Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6360, lng: 77.2190, loc: [28.6360, 77.2190], status: "working" },

  // Ashoka Road (faulty lights: 1)
  { id: "sl_ash_1", road: "Ashoka Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6250, lng: 77.2187, loc: [28.6250, 77.2187], status: "faulty" },
  { id: "sl_ash_2", road: "Ashoka Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6248, lng: 77.2165, loc: [28.6248, 77.2165], status: "working" },
  { id: "sl_ash_3", road: "Ashoka Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6250, lng: 77.2142, loc: [28.6250, 77.2142], status: "working" },

  // Barakhamba Road (faulty lights: 1)
  { id: "sl_bar_1", road: "Barakhamba Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6315, lng: 77.2197, loc: [28.6315, 77.2197], status: "faulty" },
  { id: "sl_bar_2", road: "Barakhamba Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6304, lng: 77.2245, loc: [28.6304, 77.2245], status: "working" },
  { id: "sl_bar_3", road: "Barakhamba Road", city: CITY_ID, cityId: CITY_ID, lat: 28.6290, lng: 77.2295, loc: [28.6290, 77.2295], status: "working" },

  // Tolstoy Marg (faulty lights: 0)
  { id: "sl_tol_1", road: "Tolstoy Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6315, lng: 77.2197, loc: [28.6315, 77.2197], status: "working" },
  { id: "sl_tol_2", road: "Tolstoy Marg", city: CITY_ID, cityId: CITY_ID, lat: 28.6340, lng: 77.2225, loc: [28.6340, 77.2225], status: "working" },

  // Connaught Lane (faulty lights: 0)
  { id: "sl_con_1", road: "Connaught Lane", city: CITY_ID, cityId: CITY_ID, lat: 28.6360, lng: 77.2190, loc: [28.6360, 77.2190], status: "working" },
  { id: "sl_con_2", road: "Connaught Lane", city: CITY_ID, cityId: CITY_ID, lat: 28.6352, lng: 77.2240, loc: [28.6352, 77.2240], status: "working" },
];

// ------------------------------------------------------------------
// 4. CRIME REPORTS (18 realistic incidents along the network)
// ------------------------------------------------------------------
const crimes = [
  {
    id: "cr_theft_cp_1",
    type: "Theft",
    desc: "Bicycle theft reported near Barakhamba metro gate",
    road: "Barakhamba Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6315,
    lng: 77.2197,
    loc: [28.6315, 77.2197],
    time: "10 mins ago",
    severity: "HIGH",
    riskRelevance: 75,
  },
  {
    id: "cr_harass_jan_1",
    type: "Harassment",
    desc: "Verbal harassment reported along unlit stretch of Janpath",
    road: "Janpath",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6272,
    lng: 77.2190,
    loc: [28.6272, 77.2190],
    time: "1 hour ago",
    severity: "CRITICAL",
    riskRelevance: 85,
  },
  {
    id: "cr_robbery_pks_1",
    type: "Robbery",
    desc: "Bag snatching incident near dark alley on Panchkuian Road",
    road: "Panchkuian Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6432,
    lng: 77.2084,
    loc: [28.6432, 77.2084],
    time: "3 hours ago",
    severity: "HIGH",
    riskRelevance: 80,
  },
  {
    id: "cr_vandalism_san_1",
    type: "Vandalism",
    desc: "Damaged streetlight fixture and public signage on Sansad Marg",
    road: "Sansad Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6295,
    lng: 77.2155,
    loc: [28.6295, 77.2155],
    time: "5 hours ago",
    severity: "MODERATE",
    riskRelevance: 50,
  },
  {
    id: "cr_assault_bks_1",
    type: "Assault",
    desc: "Physical assault reported near bus stand on Baba Kharak Singh Marg",
    road: "Baba Kharak Singh Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6344,
    lng: 77.2157,
    loc: [28.6344, 77.2157],
    time: "30 mins ago",
    severity: "CRITICAL",
    riskRelevance: 90,
  },
  {
    id: "cr_chain_jan_1",
    type: "Chain Snatching",
    desc: "Gold chain snatching by bike riders on Janpath",
    road: "Janpath",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6285,
    lng: 77.2192,
    loc: [28.6285, 77.2192],
    time: "4 hours ago",
    severity: "HIGH",
    riskRelevance: 80,
  },
  {
    id: "cr_theft_min_1",
    type: "Theft",
    desc: "Vehicle break-in reported on Minto Road near underpass",
    road: "Minto Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6278,
    lng: 77.2285,
    loc: [28.6278, 77.2285],
    time: "2 hours ago",
    severity: "HIGH",
    riskRelevance: 75,
  },
  {
    id: "cr_harass_pks_1",
    type: "Harassment",
    desc: "Catcalling and stalking reported near Panchkuian intersection",
    road: "Panchkuian Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6448,
    lng: 77.2070,
    loc: [28.6448, 77.2070],
    time: "6 hours ago",
    severity: "CRITICAL",
    riskRelevance: 85,
  },
  {
    id: "cr_vandal_bks_1",
    type: "Vandalism",
    desc: "Graffiti and damaged public booth on Baba Kharak Singh Marg",
    road: "Baba Kharak Singh Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6350,
    lng: 77.2145,
    loc: [28.6350, 77.2145],
    time: "12 hours ago",
    severity: "MODERATE",
    riskRelevance: 45,
  },
  {
    id: "cr_chain_min_1",
    type: "Chain Snatching",
    desc: "Attempted snatching on Minto Road underpass",
    road: "Minto Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6290,
    lng: 77.2295,
    loc: [28.6290, 77.2295],
    time: "1 day ago",
    severity: "HIGH",
    riskRelevance: 80,
  },
  {
    id: "cr_theft_san_1",
    type: "Theft",
    desc: "Phone pickpocketing near Sansad Marg crossing",
    road: "Sansad Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6280,
    lng: 77.2138,
    loc: [28.6280, 77.2138],
    time: "1 day ago",
    severity: "MODERATE",
    riskRelevance: 60,
  },
  {
    id: "cr_assault_pks_2",
    type: "Assault",
    desc: "Late night brawl reported on Panchkuian Road",
    road: "Panchkuian Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6417,
    lng: 77.2097,
    loc: [28.6417, 77.2097],
    time: "2 days ago",
    severity: "CRITICAL",
    riskRelevance: 85,
  },
  {
    id: "cr_harass_bar_1",
    type: "Harassment",
    desc: "Harassment reported near Barakhamba commercial lane",
    road: "Barakhamba Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6310,
    lng: 77.2220,
    loc: [28.6310, 77.2220],
    time: "2 days ago",
    severity: "MODERATE",
    riskRelevance: 65,
  },
  {
    id: "cr_theft_ash_1",
    type: "Theft",
    desc: "Stolen backpack from parked vehicle on Ashoka Road",
    road: "Ashoka Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6250,
    lng: 77.2187,
    loc: [28.6250, 77.2187],
    time: "3 days ago",
    severity: "LOW",
    riskRelevance: 40,
  },
  {
    id: "cr_rob_jan_2",
    type: "Robbery",
    desc: "Attempted purse snatching near Janpath flea market",
    road: "Janpath",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6268,
    lng: 77.2190,
    loc: [28.6268, 77.2190],
    time: "3 days ago",
    severity: "HIGH",
    riskRelevance: 80,
  },
  {
    id: "cr_vandal_kg_1",
    type: "Vandalism",
    desc: "Broken bench on Kasturba Gandhi Marg sidewalk",
    road: "Kasturba Gandhi Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6345,
    lng: 77.2192,
    loc: [28.6345, 77.2192],
    time: "4 days ago",
    severity: "LOW",
    riskRelevance: 30,
  },
  {
    id: "cr_chain_bks_2",
    type: "Chain Snatching",
    desc: "Snatching attempt at BKS Marg intersection",
    road: "Baba Kharak Singh Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6357,
    lng: 77.2135,
    loc: [28.6357, 77.2135],
    time: "4 days ago",
    severity: "HIGH",
    riskRelevance: 80,
  },
  {
    id: "cr_theft_tol_1",
    type: "Theft",
    desc: "Bicycle theft on Tolstoy Marg",
    road: "Tolstoy Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6328,
    lng: 77.2210,
    loc: [28.6328, 77.2210],
    time: "5 days ago",
    severity: "LOW",
    riskRelevance: 35,
  }
];

// ------------------------------------------------------------------
// 5. COMMUNITY REPORTS (18 citizen submissions)
// ------------------------------------------------------------------
const communityReports = [
  {
    id: "cm_rep_1",
    userId: "citizen_101",
    type: "Dark Area",
    desc: "Dangerous dark stretch with 4 continuous unlit poles on Baba Kharak Singh Marg",
    road: "Baba Kharak Singh Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6344,
    lng: 77.2157,
    loc: [28.6344, 77.2157],
    status: "OPEN",
    verificationStatus: "OPEN",
    riskRelevance: 75,
    time: "25 mins ago",
    photoUrls: [],
    adminNotes: ""
  },
  {
    id: "cm_rep_2",
    userId: "citizen_102",
    type: "Broken Streetlight",
    desc: "Flickering and dead streetlight outside Janpath market exit",
    road: "Janpath",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6290,
    lng: 77.2191,
    loc: [28.6290, 77.2191],
    status: "VERIFIED",
    verificationStatus: "VERIFIED",
    riskRelevance: 60,
    time: "42 mins ago",
    photoUrls: [],
    adminNotes: "Dispatched maintenance crew"
  },
  {
    id: "cm_rep_3",
    userId: "citizen_103",
    type: "Unsafe Area",
    desc: "Very low night visibility and isolated footpaths on Panchkuian Road",
    road: "Panchkuian Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6432,
    lng: 77.2084,
    loc: [28.6432, 77.2084],
    status: "OPEN",
    verificationStatus: "OPEN",
    riskRelevance: 80,
    time: "1 hour ago",
    photoUrls: [],
    adminNotes: ""
  },
  {
    id: "cm_rep_4",
    userId: "citizen_104",
    type: "Suspicious Activity",
    desc: "Group loitering near unlit Minto Road underpass",
    road: "Minto Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6278,
    lng: 77.2285,
    loc: [28.6278, 77.2285],
    status: "VERIFIED",
    verificationStatus: "VERIFIED",
    riskRelevance: 70,
    time: "2 hours ago",
    photoUrls: [],
    adminNotes: "Police patrol notified"
  },
  {
    id: "cm_rep_5",
    userId: "citizen_105",
    type: "Poor Visibility",
    desc: "Tree branches completely covering streetlight on Sansad Marg",
    road: "Sansad Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6305,
    lng: 77.2178,
    loc: [28.6305, 77.2178],
    status: "RESOLVED",
    verificationStatus: "RESOLVED",
    riskRelevance: 45,
    time: "3 hours ago",
    photoUrls: [],
    adminNotes: "Horticulture department pruned branches"
  },
  {
    id: "cm_rep_6",
    userId: "citizen_106",
    type: "Broken Streetlight",
    desc: "Dead light pole near BKS Marg bus stop",
    road: "Baba Kharak Singh Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6350,
    lng: 77.2145,
    loc: [28.6350, 77.2145],
    status: "OPEN",
    verificationStatus: "OPEN",
    riskRelevance: 60,
    time: "4 hours ago",
    photoUrls: [],
    adminNotes: ""
  },
  {
    id: "cm_rep_7",
    userId: "citizen_107",
    type: "Dark Area",
    desc: "Panchkuian Road sidewalk is completely dark after 9 PM",
    road: "Panchkuian Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6448,
    lng: 77.2070,
    loc: [28.6448, 77.2070],
    status: "OPEN",
    verificationStatus: "OPEN",
    riskRelevance: 75,
    time: "5 hours ago",
    photoUrls: [],
    adminNotes: ""
  },
  {
    id: "cm_rep_8",
    userId: "citizen_108",
    type: "Unsafe Area",
    desc: "Lack of pedestrian light near Janpath junction",
    road: "Janpath",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6268,
    lng: 77.2190,
    loc: [28.6268, 77.2190],
    status: "VERIFIED",
    verificationStatus: "VERIFIED",
    riskRelevance: 65,
    time: "6 hours ago",
    photoUrls: [],
    adminNotes: "Inspected by field team"
  },
  {
    id: "cm_rep_9",
    userId: "citizen_109",
    type: "Broken Streetlight",
    desc: "Light not turning on automatically on Kasturba Gandhi Marg",
    road: "Kasturba Gandhi Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6330,
    lng: 77.2195,
    loc: [28.6330, 77.2195],
    status: "RESOLVED",
    verificationStatus: "RESOLVED",
    riskRelevance: 40,
    time: "1 day ago",
    photoUrls: [],
    adminNotes: "Timer sensor replaced"
  },
  {
    id: "cm_rep_10",
    userId: "citizen_110",
    type: "Suspicious Activity",
    desc: "Loitering near Minto Road corner",
    road: "Minto Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6268,
    lng: 77.2270,
    loc: [28.6268, 77.2270],
    status: "OPEN",
    verificationStatus: "OPEN",
    riskRelevance: 60,
    time: "1 day ago",
    photoUrls: [],
    adminNotes: ""
  },
  {
    id: "cm_rep_11",
    userId: "citizen_111",
    type: "Dark Area",
    desc: "Dark corner near Ashoka Road crossing",
    road: "Ashoka Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6248,
    lng: 77.2165,
    loc: [28.6248, 77.2165],
    status: "RESOLVED",
    verificationStatus: "RESOLVED",
    riskRelevance: 50,
    time: "2 days ago",
    photoUrls: [],
    adminNotes: "New LED bulb installed"
  },
  {
    id: "cm_rep_12",
    userId: "citizen_112",
    type: "Poor Visibility",
    desc: "Dim lighting along Barakhamba road sidewalk",
    road: "Barakhamba Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6304,
    lng: 77.2245,
    loc: [28.6304, 77.2245],
    status: "RESOLVED",
    verificationStatus: "RESOLVED",
    riskRelevance: 40,
    time: "2 days ago",
    photoUrls: [],
    adminNotes: "Repaired"
  },
  {
    id: "cm_rep_13",
    userId: "citizen_113",
    type: "Broken Streetlight",
    desc: "Pole wiring exposed on Panchkuian Road",
    road: "Panchkuian Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6462,
    lng: 77.2058,
    loc: [28.6462, 77.2058],
    status: "VERIFIED",
    verificationStatus: "VERIFIED",
    riskRelevance: 80,
    time: "2 days ago",
    photoUrls: [],
    adminNotes: "Priority electrical repair requested"
  },
  {
    id: "cm_rep_14",
    userId: "citizen_114",
    type: "Unsafe Area",
    desc: "No lights along Baba Kharak Singh Marg outer curve",
    road: "Baba Kharak Singh Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6357,
    lng: 77.2135,
    loc: [28.6357, 77.2135],
    status: "OPEN",
    verificationStatus: "OPEN",
    riskRelevance: 75,
    time: "3 days ago",
    photoUrls: [],
    adminNotes: ""
  },
  {
    id: "cm_rep_15",
    userId: "citizen_115",
    type: "Broken Streetlight",
    desc: "Broken light fixture on Sansad Marg",
    road: "Sansad Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6293,
    lng: 77.2158,
    loc: [28.6293, 77.2158],
    status: "RESOLVED",
    verificationStatus: "RESOLVED",
    riskRelevance: 45,
    time: "3 days ago",
    photoUrls: [],
    adminNotes: "Fixed by NDMC"
  },
  {
    id: "cm_rep_16",
    userId: "citizen_116",
    type: "Dark Area",
    desc: "Janpath service lane has zero lighting",
    road: "Janpath",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6250,
    lng: 77.2187,
    loc: [28.6250, 77.2187],
    status: "OPEN",
    verificationStatus: "OPEN",
    riskRelevance: 70,
    time: "4 days ago",
    photoUrls: [],
    adminNotes: ""
  },
  {
    id: "cm_rep_17",
    userId: "citizen_117",
    type: "Poor Visibility",
    desc: "Tolstoy Marg alleyway could use additional lighting",
    road: "Tolstoy Marg",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6340,
    lng: 77.2225,
    loc: [28.6340, 77.2225],
    status: "RESOLVED",
    verificationStatus: "RESOLVED",
    riskRelevance: 35,
    time: "4 days ago",
    photoUrls: [],
    adminNotes: "Logged"
  },
  {
    id: "cm_rep_18",
    userId: "citizen_118",
    type: "Dark Area",
    desc: "Minto Road sidewalk dark after sunset",
    road: "Minto Road",
    city: CITY_ID,
    cityId: CITY_ID,
    lat: 28.6290,
    lng: 77.2295,
    loc: [28.6290, 77.2295],
    status: "OPEN",
    verificationStatus: "OPEN",
    riskRelevance: 65,
    time: "5 days ago",
    photoUrls: [],
    adminNotes: ""
  }
];

// ------------------------------------------------------------------
// 6. RISK SNAPSHOTS (7-day historical trend for Analytics)
// ------------------------------------------------------------------
const riskSnapshots = [
  { id: "snap_delhi_1", cityId: CITY_ID, city: CITY_ID, date: "8/16", timeLabel: "8/16", overallScore: 58, avgRiskScore: 58 },
  { id: "snap_delhi_2", cityId: CITY_ID, city: CITY_ID, date: "8/17", timeLabel: "8/17", overallScore: 54, avgRiskScore: 54 },
  { id: "snap_delhi_3", cityId: CITY_ID, city: CITY_ID, date: "8/18", timeLabel: "8/18", overallScore: 52, avgRiskScore: 52 },
  { id: "snap_delhi_4", cityId: CITY_ID, city: CITY_ID, date: "8/19", timeLabel: "8/19", overallScore: 49, avgRiskScore: 49 },
  { id: "snap_delhi_5", cityId: CITY_ID, city: CITY_ID, date: "8/20", timeLabel: "8/20", overallScore: 47, avgRiskScore: 47 },
  { id: "snap_delhi_6", cityId: CITY_ID, city: CITY_ID, date: "8/21", timeLabel: "8/21", overallScore: 45, avgRiskScore: 45 },
  { id: "snap_delhi_7", cityId: CITY_ID, city: CITY_ID, date: "8/22", timeLabel: "8/22", overallScore: 42, avgRiskScore: 42 },
];

export async function runSeed(): Promise<void> {
  console.log("========================================");
  console.log("SEEDING TARA FIRESTORE DATABASE (NEW DELHI)");
  console.log("========================================");

  // 1. Seed Cities
  console.log(`[1/6] Seeding ${cities.length} cities...`);
  for (const c of cities) {
    await setDoc(doc(db, "cities", c.id), {
      ...c,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  // 2. Seed Roads
  console.log(`[2/6] Seeding ${roads.length} road segments...`);
  for (const r of roads) {
    await setDoc(doc(db, "roads", r.id), {
      ...r,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  // 3. Seed Streetlights
  console.log(`[3/6] Seeding ${streetlights.length} streetlights...`);
  for (const sl of streetlights) {
    await setDoc(doc(db, "streetlights", sl.id), {
      ...sl,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  // 4. Seed Crime Reports
  console.log(`[4/6] Seeding ${crimes.length} crime reports...`);
  for (const cr of crimes) {
    await setDoc(doc(db, "crimeReports", cr.id), {
      ...cr,
      timestamp: Timestamp.now(),
    }, { merge: true });
  }

  // 5. Seed Community Reports
  console.log(`[5/6] Seeding ${communityReports.length} community reports...`);
  for (const cm of communityReports) {
    await setDoc(doc(db, "communityReports", cm.id), {
      ...cm,
      timestamp: Timestamp.now(),
    }, { merge: true });
  }

  // 6. Seed Risk Snapshots
  console.log(`[6/6] Seeding ${riskSnapshots.length} risk snapshots...`);
  for (const snap of riskSnapshots) {
    await setDoc(doc(db, "riskSnapshots", snap.id), {
      ...snap,
      timestamp: Timestamp.now(),
    }, { merge: true });
  }

  console.log("========================================");
  console.log("SUCCESS: Firestore dataset populated for New Delhi!");
  console.log("========================================");
}

// Auto-run if executed directly
if (typeof window === 'undefined') {
  runSeed().catch((err) => {
    console.error("Error seeding Firestore:", err);
  });
}
