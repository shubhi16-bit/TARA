import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import '../models/dark_zone_model.dart';
import '../models/route_model.dart';

enum MapStyleType { googleStandard, googleSatellite, googleTerrain }

class PlaceSuggestion {
  final String name;
  final String address;
  final String category;
  final IconData icon;
  final LatLng position;

  PlaceSuggestion({
    required this.name,
    required this.address,
    required this.category,
    required this.icon,
    required this.position,
  });
}

class RoutingProvider extends ChangeNotifier {
  String backendBaseUrl = 'http://10.0.2.2:5000/api';

  LatLng _currentLocation = const LatLng(28.6139, 77.2090);
  bool _isLoadingLocation = false;
  String _currentAddress = 'Connaught Place, New Delhi';
  String _locationStatus = 'GPS Active';

  // Destination & Routes
  String _currentDestination = 'Central Metro Station';
  LatLng _destinationLocation = const LatLng(28.6280, 77.2180);
  bool _isLoadingRoutes = false;
  List<RouteOptionModel> _currentRoutes = [];
  List<PlaceSuggestion> _destinationSuggestions = [];
  
  MapStyleType _mapStyle = MapStyleType.googleStandard;

  LatLng get currentLocation => _currentLocation;
  bool get isLoadingLocation => _isLoadingLocation;
  String get currentAddress => _currentAddress;
  String get locationStatus => _locationStatus;

  String get currentDestination => _currentDestination;
  LatLng get destinationLocation => _destinationLocation;
  bool get isLoadingRoutes => _isLoadingRoutes;
  List<RouteOptionModel> get currentRoutes => _currentRoutes;
  List<PlaceSuggestion> get destinationSuggestions => _destinationSuggestions;
  MapStyleType get mapStyle => _mapStyle;

  String get tileUrl {
    switch (_mapStyle) {
      case MapStyleType.googleSatellite:
        return 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
      case MapStyleType.googleTerrain:
        return 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
      case MapStyleType.googleStandard:
        return 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    }
  }

  List<String> get tileSubdomains => const ['mt0', 'mt1', 'mt2', 'mt3'];

  void setMapStyle(MapStyleType style) {
    _mapStyle = style;
    notifyListeners();
  }

  // Dark zones dataset
  final List<DarkZoneModel> _darkZones = [
    DarkZoneModel(
      id: 'DZ-1',
      roadName: 'College Road (Hostel Stretch)',
      position: const LatLng(28.6155, 77.2110),
      riskLevel: RiskLevel.critical,
      riskScore: 91,
      totalLights: 8,
      workingLights: 2,
      faultyLights: 6,
      estimatedFootfall: 'High',
      activeReports: 14,
    ),
    DarkZoneModel(
      id: 'DZ-2',
      roadName: 'Station Link Underpass',
      position: const LatLng(28.6190, 77.2160),
      riskLevel: RiskLevel.high,
      riskScore: 84,
      totalLights: 12,
      workingLights: 4,
      faultyLights: 8,
      estimatedFootfall: 'High',
      activeReports: 9,
    ),
    DarkZoneModel(
      id: 'DZ-3',
      roadName: 'Old Market By-lane',
      position: const LatLng(28.6110, 77.2050),
      riskLevel: RiskLevel.medium,
      riskScore: 62,
      totalLights: 6,
      workingLights: 3,
      faultyLights: 3,
      estimatedFootfall: 'Medium',
      activeReports: 4,
    ),
    DarkZoneModel(
      id: 'DZ-4',
      roadName: 'Main Boulevard Ring Road',
      position: const LatLng(28.6120, 77.2180),
      riskLevel: RiskLevel.low,
      riskScore: 18,
      totalLights: 24,
      workingLights: 23,
      faultyLights: 1,
      estimatedFootfall: 'High',
      activeReports: 0,
    ),
  ];

  List<DarkZoneModel> get darkZones => _darkZones;

  RoutingProvider() {
    fetchCurrentLocation().then((_) {
      calculateRealRoutes(_currentDestination);
    });
  }

  Future<void> fetchCurrentLocation() async {
    _isLoadingLocation = true;
    _locationStatus = 'Fetching GPS...';
    notifyListeners();

    bool gotGps = false;

    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
        Position pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 5),
          ),
        );
        _currentLocation = LatLng(pos.latitude, pos.longitude);
        _locationStatus = 'GPS Live';
        gotGps = true;
        await _reverseGeocodeLocation(pos.latitude, pos.longitude);
      }
    } catch (_) {}

    if (!gotGps) {
      try {
        Position? lastPos = await Geolocator.getLastKnownPosition();
        if (lastPos != null) {
          _currentLocation = LatLng(lastPos.latitude, lastPos.longitude);
          _locationStatus = 'GPS Cached';
          gotGps = true;
          await _reverseGeocodeLocation(lastPos.latitude, lastPos.longitude);
        }
      } catch (_) {}
    }

    if (!gotGps || _currentAddress == 'Detecting current location...') {
      try {
        final ipRes = await http.get(Uri.parse('http://ip-api.com/json')).timeout(const Duration(seconds: 4));
        if (ipRes.statusCode == 200) {
          final data = jsonDecode(ipRes.body);
          if (data['status'] == 'success') {
            double lat = (data['lat'] as num).toDouble();
            double lon = (data['lon'] as num).toDouble();
            String city = data['city'] ?? '';
            String region = data['regionName'] ?? '';
            _currentLocation = LatLng(lat, lon);
            _currentAddress = '$city, $region';
            _locationStatus = 'City Location';
            gotGps = true;
          }
        }
      } catch (_) {}
    }

    if (_currentAddress == 'Detecting current location...') {
      _currentAddress = 'Connaught Place, New Delhi';
      _locationStatus = 'Default Location';
    }

    _isLoadingLocation = false;
    notifyListeners();

    await calculateRealRoutes(_currentDestination);
  }

  Future<void> _reverseGeocodeLocation(double lat, double lon) async {
    try {
      final url = Uri.parse('https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lon&zoom=18&addressdetails=1');
      final res = await http.get(url, headers: {'User-Agent': 'TARA-GoogleMaps-Safety/1.0'}).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final addr = data['address'];
        if (addr != null) {
          String road = addr['road'] ?? addr['suburb'] ?? addr['neighbourhood'] ?? addr['residential'] ?? '';
          String city = addr['city'] ?? addr['town'] ?? addr['state_district'] ?? '';
          if (road.isNotEmpty) {
            _currentAddress = '$road, $city'.trim().replaceAll(RegExp(r',\s*$'), '');
            return;
          }
        }
        if (data['display_name'] != null) {
          List<String> parts = (data['display_name'] as String).split(',');
          _currentAddress = parts.take(3).join(',').trim();
          return;
        }
      }
    } catch (_) {}
  }

  void setManualLocation(String address, [LatLng? customCoordinates]) {
    _currentAddress = address;
    if (customCoordinates != null) {
      _currentLocation = customCoordinates;
    }
    _locationStatus = 'Manual Location';
    notifyListeners();
    calculateRealRoutes(_currentDestination);
  }

  /// Universal Global Search for ANY place
  Future<void> searchDestination(String query) async {
    if (query.trim().isEmpty) {
      _destinationSuggestions = [];
      notifyListeners();
      return;
    }

    final cleanQuery = query.trim().toLowerCase();
    List<PlaceSuggestion> results = [];

    // Local common destinations
    final localDemoPlaces = [
      PlaceSuggestion(
        name: 'Central Metro Station',
        address: 'Gate 3, Connaught Place',
        category: 'Transit',
        icon: Icons.directions_subway_rounded,
        position: LatLng(_currentLocation.latitude + 0.008, _currentLocation.longitude + 0.006),
      ),
      PlaceSuggestion(
        name: 'City University Campus',
        address: 'North Academic Block',
        category: 'Education',
        icon: Icons.school_rounded,
        position: LatLng(_currentLocation.latitude + 0.015, _currentLocation.longitude + 0.011),
      ),
      PlaceSuggestion(
        name: 'District General Hospital',
        address: 'Emergency Wing, Ring Road',
        category: 'Hospital',
        icon: Icons.local_hospital_rounded,
        position: LatLng(_currentLocation.latitude + 0.012, _currentLocation.longitude - 0.008),
      ),
      PlaceSuggestion(
        name: 'Cyber City Tech Park',
        address: 'Tower B, Commercial Corridor',
        category: 'Workplace',
        icon: Icons.apartment_rounded,
        position: LatLng(_currentLocation.latitude + 0.022, _currentLocation.longitude + 0.018),
      ),
      PlaceSuggestion(
        name: 'Railway Junction Main Gate',
        address: 'Station Road, Concourse',
        category: 'Transit',
        icon: Icons.train_rounded,
        position: LatLng(_currentLocation.latitude - 0.010, _currentLocation.longitude + 0.014),
      ),
      PlaceSuggestion(
        name: 'Grand Central Shopping Mall',
        address: 'Outer Ring Promenade',
        category: 'Shopping',
        icon: Icons.shopping_bag_rounded,
        position: LatLng(_currentLocation.latitude + 0.018, _currentLocation.longitude + 0.005),
      ),
      PlaceSuggestion(
        name: 'Women Working Hostel Complex',
        address: 'Shanti Path, Near Garden',
        category: 'Hostel',
        icon: Icons.home_work_rounded,
        position: LatLng(_currentLocation.latitude + 0.009, _currentLocation.longitude + 0.015),
      ),
    ];

    for (var p in localDemoPlaces) {
      if (p.name.toLowerCase().contains(cleanQuery) || p.address.toLowerCase().contains(cleanQuery)) {
        results.add(p);
      }
    }

    // Global Photon API
    try {
      final photonUrl = Uri.parse(
        'https://photon.komoot.io/api/?q=${Uri.encodeComponent(query)}&limit=10&lat=${_currentLocation.latitude}&lon=${_currentLocation.longitude}',
      );
      final photonRes = await http.get(photonUrl).timeout(const Duration(seconds: 3));
      if (photonRes.statusCode == 200) {
        final data = jsonDecode(photonRes.body);
        final features = data['features'] as List?;
        if (features != null && features.isNotEmpty) {
          for (var f in features) {
            final props = f['properties'] ?? {};
            final coords = f['geometry']['coordinates'] as List;
            String name = props['name'] ?? query;
            String street = props['street'] ?? '';
            String city = props['city'] ?? props['state'] ?? props['country'] ?? '';
            String fullAddr = [street, city].where((s) => s.isNotEmpty).join(', ');
            if (fullAddr.isEmpty) fullAddr = props['country'] ?? 'Landmark';

            IconData icon = Icons.place_rounded;
            String type = (props['osm_value'] ?? props['type'] ?? '').toString().toLowerCase();
            if (type.contains('station') || type.contains('subway') || type.contains('railway')) {
              icon = Icons.directions_subway_rounded;
            } else if (type.contains('school') || type.contains('university') || type.contains('college')) {
              icon = Icons.school_rounded;
            } else if (type.contains('hospital') || type.contains('clinic')) {
              icon = Icons.local_hospital_rounded;
            } else if (type.contains('shop') || type.contains('mall')) {
              icon = Icons.shopping_bag_rounded;
            }

            results.add(
              PlaceSuggestion(
                name: name,
                address: fullAddr,
                category: props['osm_value'] ?? 'Place',
                icon: icon,
                position: LatLng((coords[1] as num).toDouble(), (coords[0] as num).toDouble()),
              ),
            );
          }
        }
      }
    } catch (_) {}

    // Fallback Nominatim
    if (results.isEmpty) {
      try {
        final url = Uri.parse(
          'https://nominatim.openstreetmap.org/search?q=${Uri.encodeComponent(query)}&format=json&limit=6&addressdetails=1',
        );
        final res = await http.get(url, headers: {'User-Agent': 'TARA-GoogleMaps-Safety/1.0'}).timeout(const Duration(seconds: 4));
        if (res.statusCode == 200) {
          final List list = jsonDecode(res.body);
          for (var item in list) {
            String full = item['display_name'] ?? query;
            List<String> parts = full.split(',');
            results.add(
              PlaceSuggestion(
                name: parts.first.trim(),
                address: parts.skip(1).take(2).join(',').trim(),
                category: 'Location',
                icon: Icons.location_on_rounded,
                position: LatLng(double.parse(item['lat']), double.parse(item['lon'])),
              ),
            );
          }
        }
      } catch (_) {}
    }

    _destinationSuggestions = results;
    notifyListeners();
  }

  /// Calculates Road Snapped Routes
  Future<void> calculateRealRoutes(String destinationName, [LatLng? targetCoords]) async {
    _isLoadingRoutes = true;
    _currentDestination = destinationName;
    notifyListeners();

    LatLng dest = targetCoords ??
        LatLng(
          _currentLocation.latitude + 0.012,
          _currentLocation.longitude + 0.008,
        );

    if (targetCoords == null && destinationName.isNotEmpty && destinationName != 'Central Metro Station') {
      try {
        final url = Uri.parse(
          'https://nominatim.openstreetmap.org/search?q=${Uri.encodeComponent(destinationName)}&format=json&limit=1',
        );
        final res = await http.get(url, headers: {'User-Agent': 'TARA-GoogleMaps-Safety/1.0'}).timeout(const Duration(seconds: 4));
        if (res.statusCode == 200) {
          final List list = jsonDecode(res.body);
          if (list.isNotEmpty) {
            dest = LatLng(double.parse(list[0]['lat']), double.parse(list[0]['lon']));
          }
        }
      } catch (_) {}
    }

    _destinationLocation = dest;

    List<LatLng> realFastestPath = [];
    List<LatLng> realSaferPath = [];
    double calculatedDistKm = 2.1;
    int calculatedDurationMin = 18;

    try {
      final osrmUrl = Uri.parse(
        'https://router.project-osrm.org/route/v1/foot/${_currentLocation.longitude},${_currentLocation.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson&alternatives=true',
      );
      final res = await http.get(osrmUrl).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final routes = data['routes'] as List?;
        if (routes != null && routes.isNotEmpty) {
          final coords1 = routes[0]['geometry']['coordinates'] as List;
          realFastestPath = coords1.map((c) => LatLng(c[1] as double, c[0] as double)).toList();
          calculatedDistKm = double.parse(((routes[0]['distance'] as num) / 1000).toStringAsFixed(1));
          calculatedDurationMin = ((routes[0]['duration'] as num) / 60).round();

          if (routes.length > 1) {
            final coords2 = routes[1]['geometry']['coordinates'] as List;
            realSaferPath = coords2.map((c) => LatLng(c[1] as double, c[0] as double)).toList();
          }
        }
      }
    } catch (_) {}

    // Fallback road-aligned geometries
    if (realFastestPath.isEmpty) {
      double latDiff = dest.latitude - _currentLocation.latitude;
      double lonDiff = dest.longitude - _currentLocation.longitude;
      realFastestPath = [
        _currentLocation,
        LatLng(_currentLocation.latitude + latDiff * 0.4, _currentLocation.longitude),
        LatLng(_currentLocation.latitude + latDiff * 0.4, _currentLocation.longitude + lonDiff * 0.6),
        LatLng(_currentLocation.latitude + latDiff * 0.8, _currentLocation.longitude + lonDiff * 0.6),
        dest,
      ];
      calculatedDistKm = 1.8;
      calculatedDurationMin = 14;
    }

    if (realSaferPath.isEmpty) {
      double latDiff = dest.latitude - _currentLocation.latitude;
      double lonDiff = dest.longitude - _currentLocation.longitude;
      realSaferPath = [
        _currentLocation,
        LatLng(_currentLocation.latitude, _currentLocation.longitude + lonDiff * 0.5),
        LatLng(_currentLocation.latitude + latDiff * 0.3, _currentLocation.longitude + lonDiff * 0.5),
        LatLng(_currentLocation.latitude + latDiff * 0.7, _currentLocation.longitude + lonDiff * 0.9),
        LatLng(_currentLocation.latitude + latDiff, _currentLocation.longitude + lonDiff * 0.9),
        dest,
      ];
    }

    _currentRoutes = [
      RouteOptionModel(
        title: 'Direct Shortcut (via Underpass)',
        typeTag: 'FASTEST ROUTE',
        distanceKm: calculatedDistKm,
        durationMinutes: calculatedDurationMin > 0 ? calculatedDurationMin : 12,
        riskLevel: RiskLevel.critical,
        riskScore: 84,
        litPercentage: 38,
        footfallExposure: 'Low / Isolated Dark Stretch',
        isRecommended: false,
        safetySummary: '⚠️ 5 faulty streetlights & dark underpass. Low pedestrian presence at night.',
        waypoints: realFastestPath,
      ),
      RouteOptionModel(
        title: 'Main Boulevard Corridor',
        typeTag: 'TARA SAFER ROUTE',
        distanceKm: double.parse((calculatedDistKm + 0.3).toStringAsFixed(1)),
        durationMinutes: calculatedDurationMin + 3,
        riskLevel: RiskLevel.low,
        riskScore: 22,
        litPercentage: 96,
        footfallExposure: 'High / Active Night Walkers',
        isRecommended: true,
        safetySummary: '🟢 96% streetlights operational with continuous footfall & active commercial frontage.',
        waypoints: realSaferPath,
      ),
    ];

    _isLoadingRoutes = false;
    notifyListeners();
  }
}
