# Firebase Data Structure

This document outlines the Firestore structure for the TARA project.

## Collections

### 1. `authorities`
Stores authority user profiles.
- `uid` (Document ID)
- `email`: string
- `name`: string
- `city`: string (e.g. "New Delhi")
- `role`: string (e.g. "admin", "officer")

### 2. `cities`
Stores geographical boundaries and settings for cities.
- `id` (Document ID)
- `name`: string
- `center`: [latitude, longitude]
- `boundaries`: GeoJSON or array of coordinates

### 3. `roads`
Stores road information and current safety scores.
- `id` (Document ID)
- `name`: string
- `cityId`: string
- `safetyScore`: number (0-100)

### 4. `streetlights`
Stores streetlight infrastructure status.
- `id` (Document ID)
- `loc`: [latitude, longitude]
- `status`: string ("working", "broken")
- `cityId`: string

### 5. `crimeReports`
Stores verified historical crime data.
- `id` (Document ID)
- `type`: string
- `desc`: string
- `loc`: [latitude, longitude]
- `cityId`: string
- `timestamp`: timestamp
- `riskRelevance`: number

### 6. `communityReports`
Stores real-time reports submitted by citizens via the mobile app.
- `id` (Document ID)
- `userId`: string
- `type`: string (e.g. "harassment", "broken_light")
- `desc`: string
- `loc`: [latitude, longitude]
- `cityId`: string
- `timestamp`: timestamp
- `photoUrls`: array of strings
- `verificationStatus`: string ("pending", "verified", "rejected")
- `adminNotes`: string
- `status`: string ("open", "in_progress", "resolved")
- `riskRelevance`: number

### 7. `riskSnapshots`
Stores historical snapshots of overall risk scores for analytics.
- `id` (Document ID)
- `cityId`: string
- `timestamp`: timestamp
- `overallScore`: number

### 8. `authorityActions`

Stores authority actions taken from the Action Priority page.

- `roadId`: string
- `roadName`: string
- `action`: string (`repair`, `inspect`, `maintenance`)
- `score`: number
- `city`: string
- `timestamp`: timestamp

## Storage

### `/communityReports`
Photos uploaded by citizens attached to their reports. Path: `/communityReports/{reportId}/{filename}`

