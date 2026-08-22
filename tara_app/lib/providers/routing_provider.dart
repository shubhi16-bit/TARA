import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import '../models/dark_zone_model.dart';
import '../models/route_model.dart';
import '../models/monitored_location.dart';
import '../config/app_config.dart';

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

class _OsrmResult {
  final List<LatLng> points;
  final double distanceKm;
  final int durationMin;
  final List<RouteStepModel> steps;
  final List<LatLng> altPoints;
  final List<RouteStepModel> altSteps;

  _OsrmResult({
    required this.points,
    required this.distanceKm,
    required this.durationMin,
    this.steps = const [],
    this.altPoints = const [],
    this.altSteps = const [],
  });
}

class RoutingProvider extends ChangeNotifier {
  String backendBaseUrl = AppConfig.apiBaseUrl;
  bool _disposed = false;

  void _notify() {
    if (!_disposed) super.notifyListeners();
  }

  /// Index of the waypoint closest to [target] (used for live nav progress).
  static int nearestWaypointIndex(List<LatLng> pts, LatLng target) {
    var best = 0;
    var bestD = double.infinity;
    for (var i = 0; i < pts.length; i++) {
      final dLat = pts[i].latitude - target.latitude;
      final dLon = pts[i].longitude - target.longitude;
      final d = dLat * dLat + dLon * dLon;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  MonitoredLocation? _selectedMonitoredLocation = MonitoredLocation.delhiMonitoredLocations.first;
  bool _useDeviceGps = false;

  MonitoredLocation? get selectedMonitoredLocation => _selectedMonitoredLocation;
  bool get useDeviceGps => _useDeviceGps;

  LatLng _currentLocation = MonitoredLocation.delhiMonitoredLocations.first.coordinates;
  bool _isLoadingLocation = false;
  String _currentAddress = 'Janpath, Central Delhi (New Delhi)';
  String _locationStatus = 'Monitored: Janpath';

  void selectMonitoredLocation(MonitoredLocation location) {
    _selectedMonitoredLocation = location;
    _useDeviceGps = false;
    _currentLocation = location.coordinates;
    _currentAddress = '${location.name}, ${location.area} (${location.city})';
    _locationStatus = 'Monitored: ${location.name}';
    _hasFix = true;
    _notify();
  }

  Future<void> enableDeviceGps() async {
    _useDeviceGps = true;
    _selectedMonitoredLocation = null;
    _locationStatus = 'Using Device GPS';
    await fetchCurrentLocation();
    _notify();
  }

  // Destination & Routes
  String _currentDestination = '';
  LatLng _destinationLocation = const LatLng(28.6280, 77.2180);
  bool _isLoadingRoutes = false;
  List<RouteOptionModel> _currentRoutes = [];
  List<PlaceSuggestion> _destinationSuggestions = [];
  String? _routeError;
  int _travelMode = 0; // 0: Walk, 1: Drive

  MapStyleType _mapStyle = MapStyleType.googleStandard;

  // Perf: debounce, stale-response guards & caches
  Timer? _searchDebounce;
  int _searchToken = 0;
  int _routeToken = 0;
  final Map<String, LatLng> _geocodeCache = {};

  LatLng get currentLocation => _currentLocation;
  bool get isLoadingLocation => _isLoadingLocation;
  String get currentAddress => _currentAddress;
  String get locationStatus => _locationStatus;

  /// True once we have a real fix (GPS or IP), not the hardcoded default.
  bool get hasLocationFix => _hasFix;
  bool _hasFix = false;

  String get currentDestination => _currentDestination;
  LatLng get destinationLocation => _destinationLocation;
  bool get isLoadingRoutes => _isLoadingRoutes;
  List<RouteOptionModel> get currentRoutes => _currentRoutes;
  List<PlaceSuggestion> get destinationSuggestions => _destinationSuggestions;
  String? get routeError => _routeError;
  bool get hasDestination => _currentDestination.trim().isNotEmpty;
  int get travelMode => _travelMode;

  void setTravelMode(int mode) {
    if (_travelMode == mode) return;
    _travelMode = mode;
    if (hasDestination) {
      calculateRealRoutes(_currentDestination);
    } else {
      _notify();
    }
  }

  MapStyleType get mapStyle => _mapStyle;

  // Reliable free tile sources (no throttling / blocking like mt*.google.com)
  String get tileUrl {
    switch (_mapStyle) {
      case MapStyleType.googleSatellite:
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case MapStyleType.googleTerrain:
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      case MapStyleType.googleStandard:
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    }
  }

  List<String> get tileSubdomains {
    switch (_mapStyle) {
      case MapStyleType.googleSatellite:
        return const [];
      case MapStyleType.googleTerrain:
        return const ['a', 'b', 'c'];
      case MapStyleType.googleStandard:
        return const ['a', 'b', 'c', 'd'];
    }
  }

  /// Only the standard style serves native @2x ({r}) tiles - enabling retina
  /// on the others would trigger heavy simulation mode.
  bool get tileRetina => _mapStyle == MapStyleType.googleStandard;

  void setMapStyle(MapStyleType style) {
    if (_mapStyle == style) return;
    _mapStyle = style;
    _notify();
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
    fetchCurrentLocation();
  }

  @override
  void dispose() {
    _disposed = true;
    _searchDebounce?.cancel();
    super.dispose();
  }

  /// Live position updates (used during turn-by-turn navigation so the blue
  /// dot, camera and remaining stats all stay in sync).
  void updateLivePosition(LatLng pos) {
    _currentLocation = pos;
    _hasFix = true;
    _notify();
  }

  Future<void> fetchCurrentLocation() async {
    _isLoadingLocation = true;
    _locationStatus = 'Fetching GPS...';
    _notify();

    bool gotGps = false;

    try {
      // 1. Is the GPS / network provider switched on at OS level?
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();

      // 2. Permission state - never re-request if permanently denied.
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied && serviceEnabled) {
        permission = await Geolocator.requestPermission();
      }

      final canUseGps = serviceEnabled &&
          (permission == LocationPermission.whileInUse ||
              permission == LocationPermission.always);

      if (canUseGps) {
        Position pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.best,
            timeLimit: Duration(seconds: 12),
          ),
        );
        _currentLocation = LatLng(pos.latitude, pos.longitude);
        _locationStatus = 'GPS \u00B1${pos.accuracy.round()}m';
        _hasFix = true;
        gotGps = true;
        _notify();

        // Refine: listen until we get a high-accuracy fix (bounded by 8s)
        try {
          final done = Completer<void>();
          StreamSubscription<Position>? sub;
          final kill = Timer(const Duration(seconds: 8), () {
            if (!done.isCompleted) done.complete();
          });
          sub = Geolocator.getPositionStream(
            locationSettings: const LocationSettings(accuracy: LocationAccuracy.best),
          ).listen((p) {
            if (p.accuracy < 100 && p.accuracy < pos.accuracy) pos = p;
            _currentLocation = LatLng(pos.latitude, pos.longitude);
            _locationStatus = 'GPS \u00B1${pos.accuracy.round()}m';
            _notify();
            if (pos.accuracy <= 15 && !done.isCompleted) done.complete();
          }, onError: (_) {
            if (!done.isCompleted) done.complete();
          });
          await done.future;
          kill.cancel();
          await sub.cancel();
        } catch (_) {}

        _locationStatus = 'GPS Live';
        await _reverseGeocodeLocation(pos.latitude, pos.longitude);
      }
    } catch (_) {}

    if (!gotGps) {
      try {
        Position? lastPos = await Geolocator.getLastKnownPosition();
        if (lastPos != null) {
          _currentLocation = LatLng(lastPos.latitude, lastPos.longitude);
          _locationStatus = 'GPS Cached';
          _hasFix = true;
          gotGps = true;
          _notify();
          await _reverseGeocodeLocation(lastPos.latitude, lastPos.longitude);
        }
      } catch (_) {}
    }

    // 3. Last resort: IP-based geolocation over HTTPS (HTTP is blocked by
    //    Android's cleartext policy which silently killed the old fallback).
    if (!gotGps) {
      gotGps = await _locateByIp();
    }

    if (!_hasFix) {
      _locationStatus = 'Default Location';
      _currentAddress = 'Location unavailable';
    }

    _isLoadingLocation = false;
    _notify();

    await calculateRealRoutes(_currentDestination);
  }

  /// City-level location from the device's public IP. Tries two free HTTPS
  /// providers so one being down doesn't break detection.
  Future<bool> _locateByIp() async {
    // Provider 1: ipwho.is
    try {
      final res = await http.get(Uri.parse('https://ipwho.is/')).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['latitude'] != null) {
          double lat = (data['latitude'] as num).toDouble();
          double lon = (data['longitude'] as num).toDouble();
          String city = data['city'] ?? '';
          String region = data['region'] ?? '';
          _currentLocation = LatLng(lat, lon);
          _currentAddress = [city, region].where((s) => s.toString().trim().isNotEmpty).join(', ');
          _locationStatus = 'City Location (IP)';
          _hasFix = true;
          return true;
        }
      }
    } catch (_) {}

    // Provider 2: ipapi.co
    try {
      final res = await http.get(Uri.parse('https://ipapi.co/json/')).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['latitude'] != null && data['longitude'] != null) {
          double lat = (data['latitude'] as num).toDouble();
          double lon = (data['longitude'] as num).toDouble();
          String city = data['city'] ?? '';
          String region = data['region'] ?? '';
          _currentLocation = LatLng(lat, lon);
          _currentAddress = [city, region].where((s) => s.toString().trim().isNotEmpty).join(', ');
          _locationStatus = 'City Location (IP)';
          _hasFix = true;
          return true;
        }
      }
    } catch (_) {}

    return false;
  }

  Future<void> _reverseGeocodeLocation(double lat, double lon) async {
    // 1. Nominatim (most detailed street-level addresses)
    try {
      final url = Uri.parse('https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lon&zoom=18&addressdetails=1');
      final res = await http.get(url, headers: {'User-Agent': 'TARA-GoogleMaps-Safety/1.0'}).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final addr = data['address'];
        if (addr != null) {
          String road = addr['road'] ?? addr['pedestrian'] ?? addr['footway'] ?? addr['suburb'] ?? addr['neighbourhood'] ?? '';
          String sublocal = addr['suburb'] ?? addr['neighbourhood'] ?? addr['quarter'] ?? '';
          String city = addr['city'] ?? addr['town'] ?? addr['village'] ?? addr['state_district'] ?? '';
          final bits = <String>[];
          for (final s in [road, sublocal, city]) {
            final v = s.toString().trim();
            if (v.isNotEmpty && !bits.contains(v)) bits.add(v);
          }
          if (bits.isNotEmpty) {
            _currentAddress = bits.take(2).join(', ');
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

    // 2. Photon reverse fallback
    try {
      final url = Uri.parse('https://photon.komoot.io/reverse?lat=$lat&lon=$lon&lang=en');
      final res = await http.get(url).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final features = data['features'] as List?;
        if (features != null && features.isNotEmpty) {
          final props = (features[0]['properties'] is Map) ? features[0]['properties'] as Map : const {};
          final name = _s(props['name']) ?? _s(props['street']) ?? _s(props['district']);
          final city = _s(props['city']) ?? _s(props['county']) ?? _s(props['state']);
          final bits = [name, city].whereType<String>().toList();
          if (bits.isNotEmpty) {
            _currentAddress = bits.join(', ');
            return;
          }
        }
      }
    } catch (_) {}
  }

  void setManualLocation(String address, [LatLng? customCoordinates]) {
    _currentAddress = address;
    if (customCoordinates != null) {
      _currentLocation = customCoordinates;
    }
    _hasFix = true;
    _locationStatus = 'Manual Location';
    _notify();
    calculateRealRoutes(_currentDestination);
  }

  /// Debounced universal global search for ANY place.
  /// Called on every keystroke from the UI - actual network calls are
  /// debounced and stale responses are discarded.
  void searchDestination(String query) {
    _searchDebounce?.cancel();
    final q = query.trim();

    if (q.isEmpty) {
      _searchToken++; // invalidate any in-flight request
      _destinationSuggestions = [];
      _notify();
      return;
    }
    if (q.length < 2) return;

    _searchDebounce = Timer(const Duration(milliseconds: 350), () {
      _runPlaceSearch(q);
    });
  }

  Future<void> _runPlaceSearch(String q) async {
    final token = ++_searchToken;
    _notify();

    // Pasted coordinates ("28.6139, 77.2090") -> instant dropped-pin result
    final coordMatch =
        RegExp(r'^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$').firstMatch(q);
    if (coordMatch != null) {
      final lat = double.tryParse(coordMatch.group(1)!);
      final lon = double.tryParse(coordMatch.group(2)!);
      if (lat != null && lon != null && lat.abs() <= 90 && lon.abs() <= 180) {
        _destinationSuggestions = [
          PlaceSuggestion(
            name: 'Dropped Pin',
            address: q,
            category: 'Coordinates',
            icon: Icons.location_on_rounded,
            position: LatLng(lat, lon),
          ),
        ];
        _notify();
        return;
      }
    }

    try {
      // Query both providers in parallel -> faster + more complete results
      final results = await Future.wait([
        _queryPhoton(q),
        _queryNominatim(q),
      ]);

      if (token != _searchToken) return; // stale response, drop it

      final merged = <PlaceSuggestion>[];
      final seen = <String>{};
      for (final list in results) {
        for (final p in list) {
          final key =
              '${p.name.toLowerCase()}|${p.position.latitude.toStringAsFixed(4)}|${p.position.longitude.toStringAsFixed(4)}';
          if (seen.add(key)) merged.add(p);
        }
      }

      _destinationSuggestions = merged;
    } catch (_) {
      if (token != _searchToken) return;
      _destinationSuggestions = [];
    }
    _notify();
  }

  static String? _s(dynamic v) =>
      (v is String && v.trim().isNotEmpty) ? v.trim() : null;

  static IconData _iconForOsm(String value, String key) {
    final v = '$value $key'.toLowerCase();
    if (v.contains('station') || v.contains('subway') || v.contains('railway') || v.contains('halt')) {
      return Icons.directions_subway_rounded;
    }
    if (v.contains('bus')) return Icons.directions_bus_rounded;
    if (v.contains('airport') || v.contains('aerodrome')) return Icons.flight_rounded;
    if (v.contains('school') || v.contains('university') || v.contains('college') || v.contains('institute') || v.contains('library')) {
      return Icons.school_rounded;
    }
    if (v.contains('hospital') || v.contains('clinic') || v.contains('doctors') || v.contains('pharmacy') || v.contains('health')) {
      return Icons.local_hospital_rounded;
    }
    if (v.contains('mall') || v.contains('supermarket') || v.contains('shop') || v.contains('marketplace') || v.contains('department_store') || v.contains('clothes')) {
      return Icons.shopping_bag_rounded;
    }
    if (v.contains('restaurant') || v.contains('cafe') || v.contains('fast_food') || v.contains('bar') || v.contains('pub') || v.contains('food_court')) {
      return Icons.restaurant_rounded;
    }
    if (v.contains('bank') || v.contains('atm')) return Icons.account_balance_rounded;
    if (v.contains('police')) return Icons.local_police_rounded;
    if (v.contains('fuel')) return Icons.local_gas_station_rounded;
    if (v.contains('park') || v.contains('garden') || v.contains('playground')) {
      return Icons.park_rounded;
    }
    if (v.contains('hotel') || v.contains('hostel') || v.contains('guest_house') || v.contains('motel')) {
      return Icons.hotel_rounded;
    }
    if (v.contains('museum') || v.contains('artwork') || v.contains('theatre') || v.contains('cinema')) {
      return Icons.museum_rounded;
    }
    if (v.contains('place_of_worship') || v.contains('temple') || v.contains('mosque') || v.contains('church')) {
      return Icons.temple_buddhist_rounded;
    }
    if (v.contains('city') || v.contains('town') || v.contains('village') || v.contains('suburb') || v.contains('neighbourhood') || v.contains('hamlet')) {
      return Icons.location_city_rounded;
    }
    return Icons.place_rounded;
  }

  Future<List<PlaceSuggestion>> _queryPhoton(String q) async {
    try {
      final photonUrl = Uri.parse(
        'https://photon.komoot.io/api/?q=${Uri.encodeComponent(q)}'
        '&limit=10&lang=en'
        '&lat=${_currentLocation.latitude}&lon=${_currentLocation.longitude}',
      );
      final res = await http.get(photonUrl).timeout(const Duration(seconds: 6));
      if (res.statusCode != 200) return const [];

      final data = jsonDecode(res.body);
      final features = data['features'] as List? ?? const [];
      final out = <PlaceSuggestion>[];

      for (var f in features) {
        final props = (f['properties'] is Map) ? f['properties'] as Map : const {};
        final coords = f['geometry']?['coordinates'];
        if (coords is! List || coords.length < 2) continue;

        String name = _s(props['name']) ??
            _s(props['street']) ??
            _s(props['district']) ??
            _s(props['city']) ??
            q;
        String fullAddr = [
          _s(props['street']),
          _s(props['housenumber']),
          _s(props['district']),
          _s(props['city']),
          _s(props['county']),
          _s(props['state']),
          _s(props['country']),
        ].whereType<String>().toSet().join(', ');
        if (fullAddr.isEmpty) fullAddr = _s(props['country']) ?? 'Location';

        final osmValue = (_s(props['osm_value']) ?? '').toLowerCase();
        final osmKey = (_s(props['osm_key']) ?? '').toLowerCase();

        out.add(PlaceSuggestion(
          name: name,
          address: fullAddr,
          category: _s(props['osm_value']) ?? _s(props['type']) ?? 'Place',
          icon: _iconForOsm(osmValue, osmKey),
          position: LatLng(
            (coords[1] as num).toDouble(),
            (coords[0] as num).toDouble(),
          ),
        ));
      }
      return out;
    } catch (_) {
      return const [];
    }
  }

  Future<List<PlaceSuggestion>> _queryNominatim(String q) async {
    try {
      final url = Uri.parse(
        'https://nominatim.openstreetmap.org/search?q=${Uri.encodeComponent(q)}'
        '&format=jsonv2&limit=8&addressdetails=1',
      );
      final res = await http
          .get(url, headers: {'User-Agent': 'TARA-GoogleMaps-Safety/1.0'})
          .timeout(const Duration(seconds: 6));
      if (res.statusCode != 200) return const [];

      final List list = jsonDecode(res.body);
      final out = <PlaceSuggestion>[];
      for (var item in list) {
        final lat = double.tryParse('${item['lat']}');
        final lon = double.tryParse('${item['lon']}');
        if (lat == null || lon == null) continue;

        String name = _s(item['name']) ?? '';
        if (name.isEmpty) {
          final display = _s(item['display_name']) ?? q;
          name = display.split(',').first.trim();
        }

        String address = _s(item['display_name']) ?? '';
        final parts = address.split(',');
        address = parts.length > 3
            ? parts.skip(1).take(3).join(',').trim()
            : (parts.length > 1 ? parts.sublist(1).join(',').trim() : '');

        out.add(PlaceSuggestion(
          name: name,
          address: address.isEmpty ? 'Location' : address,
          category: _s(item['type']) ?? 'Location',
          icon: _iconForOsm(_s(item['type']) ?? '', _s(item['class']) ?? ''),
          position: LatLng(lat, lon),
        ));
      }
      return out;
    } catch (_) {
      return const [];
    }
  }

  /// Cached forward geocoding
  Future<LatLng?> _geocode(String name) async {
    final key = name.toLowerCase().trim();
    if (_geocodeCache.containsKey(key)) return _geocodeCache[key];
    try {
      final url = Uri.parse(
        'https://nominatim.openstreetmap.org/search?q=${Uri.encodeComponent(name)}&format=json&limit=1',
      );
      final res = await http
          .get(url, headers: {'User-Agent': 'TARA-GoogleMaps-Safety/1.0'})
          .timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final List list = jsonDecode(res.body);
        if (list.isNotEmpty) {
          final pos = LatLng(double.parse(list[0]['lat']), double.parse(list[0]['lon']));
          _geocodeCache[key] = pos;
          return pos;
        }
      }
    } catch (_) {}
    return null;
  }

  static String _cap(String s) => s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';

  /// Builds Google-Maps-style instructions from OSRM maneuver data.
  static String _buildInstruction(String type, String modifier, String road, bool isLast) {
    final on = road.isNotEmpty ? ' onto $road' : '';
    switch (type) {
      case 'depart':
        return road.isNotEmpty ? 'Start along $road' : 'Start walking';
      case 'arrive':
        return isLast ? 'Arrive at your destination' : 'Arrive at waypoint';
      case 'turn':
      case 'end of road':
        return '${_cap(modifier.isEmpty ? 'continue straight' : 'turn $modifier')}$on';
      case 'new name':
        return 'Continue$on';
      case 'continue':
        if (modifier == 'uturn') return 'Make a U-turn$on';
        if (modifier == 'slight left') return 'Bear slight left$on';
        if (modifier == 'slight right') return 'Bear slight right$on';
        return 'Continue straight$on';
      case 'merge':
        return 'Merge${modifier.isNotEmpty ? ' $modifier' : ''}$on';
      case 'on ramp':
        return 'Take the ramp$on';
      case 'off ramp':
        return 'Take the exit$on';
      case 'fork':
        return 'Keep ${modifier.contains('left') ? 'left' : 'right'}$on';
      case 'roundabout':
      case 'rotary':
        return 'Enter the roundabout and continue$on';
      case 'exit roundabout':
      case 'exit rotary':
        return 'Exit the roundabout$on';
      default:
        return 'Continue$on';
    }
  }

  static List<RouteStepModel> _parseSteps(List legs, List<LatLng> pathPoints) {
    final steps = <RouteStepModel>[];
    for (var li = 0; li < legs.length; li++) {
      final leg = legs[li];
      final legSteps = leg['steps'] as List? ?? const [];
      final isLastLeg = li == legs.length - 1;
      for (var si = 0; si < legSteps.length; si++) {
        final st = legSteps[si];
        final man = (st['maneuver'] is Map) ? st['maneuver'] as Map : const {};
        final loc = man['location'];
        if (loc is! List || loc.length < 2) continue;

        final type = (man['type'] ?? '').toString();
        final modifier = (man['modifier'] ?? '').toString();
        final road = (st['name'] ?? '').toString();
        final pt = LatLng((loc[1] as num).toDouble(), (loc[0] as num).toDouble());
        final isLastStep = isLastLeg && si == legSteps.length - 1;

        steps.add(RouteStepModel(
          instruction: _buildInstruction(type, modifier, road, isLastStep),
          distanceMeters: (st['distance'] as num?)?.toDouble() ?? 0,
          durationSeconds: (st['duration'] as num?)?.round() ?? 0,
          maneuverType: type,
          maneuverModifier: modifier,
          roadName: road,
          point: pt,
          startIndex: nearestWaypointIndex(pathPoints, pt),
        ));
      }
    }
    // Drop intermediate arrive/depart pairs from multi-leg detour routes
    if (steps.length > 2) {
      steps.removeWhere((s) =>
          identical(s, steps.first) == false &&
          s.maneuverType == 'depart');
      steps.removeWhere((s) =>
          identical(s, steps.last) == false &&
          s.maneuverType == 'arrive');
    }
    return steps;
  }

  Future<_OsrmResult?> _fetchOsrm(List<LatLng> points, {bool alternatives = false}) async {
    try {
      final coords = points.map((p) => '${p.longitude},${p.latitude}').join(';');
      final osrmUrl = Uri.parse(
        'https://router.project-osrm.org/route/v1/driving/$coords'
        '?overview=full&geometries=geojson&steps=true&alternatives=$alternatives',
      );
      final res = await http.get(osrmUrl).timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;

      final data = jsonDecode(res.body);
      final routes = data['routes'] as List?;
      if (routes == null || routes.isEmpty) return null;

      List<LatLng> parseCoords(List c) =>
          c.map((c) => LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble())).toList();

      List<RouteStepModel> parseRouteSteps(Map r, List<LatLng> pts) {
        final legs = r['legs'] as List? ?? const [];
        if (legs.isEmpty) return const [];
        return _parseSteps(legs, pts);
      }

      final mainPts = parseCoords(routes[0]['geometry']['coordinates'] as List);
      final mainSteps = parseRouteSteps((routes[0] as Map), mainPts);

      final hasAlt = routes.length > 1 && alternatives;
      final altPts = hasAlt
          ? parseCoords(routes[1]['geometry']['coordinates'] as List)
          : const <LatLng>[];
      final altSteps = hasAlt ? parseRouteSteps((routes[1] as Map), altPts) : const <RouteStepModel>[];

      return _OsrmResult(
        points: mainPts,
        distanceKm: ((routes[0]['distance'] as num) / 1000).toDouble(),
        durationMin: ((routes[0]['duration'] as num) / 60).round(),
        steps: mainSteps,
        altPoints: altPts,
        altSteps: altSteps,
      );
    } catch (_) {
      return null;
    }
  }

  /// Perpendicular mid-point detour (~500 m sideways) used to force a real
  /// second road-snapped route when OSRM returns no alternative.
  LatLng _detourVia(LatLng a, LatLng b) {
    final midLat = (a.latitude + b.latitude) / 2;
    final midLon = (a.longitude + b.longitude) / 2;
    final dLat = b.latitude - a.latitude;
    final dLon = b.longitude - a.longitude;
    final len = sqrt(dLat * dLat + dLon * dLon);
    const offsetDeg = 0.0045; // ~500 m
    if (len < 1e-9) return LatLng(midLat + offsetDeg, midLon);
    return LatLng(midLat + (-dLon / len) * offsetDeg, midLon + (dLat / len) * offsetDeg);
  }

  double _pathKm(List<LatLng> pts) {
    final d = Distance();
    var total = 0.0;
    for (var i = 1; i < pts.length; i++) {
      total += d(pts[i - 1], pts[i]);
    }
    return total / 1000;
  }

  int _walkMinutes(double km) => max(1, (km * 12).round()); // ~5 km/h

  int _driveMinutes(double km) => max(1, (km / 25 * 60).round()); // ~25 km/h city

  int _minutesFor(double km) => _travelMode == 1 ? _driveMinutes(km) : _walkMinutes(km);

  /// Rough streetlight estimate from known dark zones along the path.
  int _estimateLitPercent(List<LatLng> pts) {
    if (pts.isEmpty) return 85;
    final d = Distance();
    var flagged = 0.0;
    var checked = 0;
    for (final p in pts) {
      checked++;
      for (final z in _darkZones) {
        final w = z.riskLevel == RiskLevel.critical
            ? 1.0
            : z.riskLevel == RiskLevel.high
                ? 0.7
                : z.riskLevel == RiskLevel.medium
                    ? 0.4
                    : 0.1;
        if (d(p, z.position) < 250) {
          flagged += w;
          break;
        }
      }
    }
    if (checked == 0) return 85;
    return (100 - (flagged / checked) * 70).round().clamp(15, 99);
  }

  RouteOptionModel _buildRouteModel({
    required List<LatLng> path,
    required List<RouteStepModel> steps,
    required double km,
    required bool primary,
  }) {
    final lit = _estimateLitPercent(path);
    final safe = primary || lit >= 75;
    return RouteOptionModel(
      title: primary ? 'Fastest Route' : 'Alternative Route',
      typeTag: primary ? 'FASTEST ROUTE' : 'TARA SAFER ROUTE',
      distanceKm: double.parse(km.toStringAsFixed(1)),
      durationMinutes: _minutesFor(km),
      riskLevel: safe ? RiskLevel.low : RiskLevel.high,
      riskScore: safe ? 22 : min(95, 100 - lit),
      litPercentage: lit,
      footfallExposure: safe ? 'Main Roads' : 'Side Streets',
      isRecommended: !primary,
      safetySummary: safe
          ? '\uD83D\uDFE2 Mostly main roads with expected street lighting.'
          : '\u26A0\uFE0F Passes stretches with poor or no street lighting data.',
      waypoints: path,
      steps: steps,
    );
  }

  /// Calculates road-snapped routes via OSRM using REAL road network data.
  Future<void> calculateRealRoutes(String destinationName, [LatLng? targetCoords]) async {
    final token = ++_routeToken;

    if (destinationName.trim().isEmpty && targetCoords == null) {
      _currentRoutes = [];
      _currentDestination = '';
      _isLoadingRoutes = false;
      _routeError = null;
      _notify();
      return;
    }

    _isLoadingRoutes = true;
    _routeError = null;
    if (destinationName.isNotEmpty && destinationName != _currentDestination) {
      _currentDestination = destinationName;
    }
    _notify();

    LatLng? dest = targetCoords ?? await _geocode(destinationName);

    if (token != _routeToken) return;

    if (dest == null) {
      _currentRoutes = [];
      _destinationLocation = _currentLocation;
      _isLoadingRoutes = false;
      _routeError = 'Destination not found. Try another search.';
      _notify();
      return;
    }

    _destinationLocation = dest;
    _notify();

    final direct = await _fetchOsrm([_currentLocation, dest], alternatives: true);
    if (token != _routeToken) return;

    if (direct == null || direct.points.length < 2) {
      _currentRoutes = [];
      _isLoadingRoutes = false;
      _routeError = 'Could not find a road route. Check your internet connection.';
      _notify();
      return;
    }

    final models = <RouteOptionModel>[
      _buildRouteModel(
        path: direct.points,
        steps: direct.steps,
        km: direct.distanceKm,
        primary: true,
      ),
    ];

    List<LatLng> altPath = direct.altPoints;
    List<RouteStepModel> altSteps = direct.altSteps;

    // No OSRM alternative -> force a second REAL road route via a detour waypoint.
    if (altPath.isEmpty && direct.distanceKm > 0.3) {
      final detour = await _fetchOsrm([_currentLocation, _detourVia(_currentLocation, dest)]);
      if (token != _routeToken) return;
      if (detour != null && detour.points.length >= 2 && _pathKm(detour.points) > direct.distanceKm * 1.05) {
        altPath = detour.points;
        altSteps = detour.steps;
      }
    }

    if (altPath.length >= 2) {
      models.add(_buildRouteModel(
        path: altPath,
        steps: altSteps,
        km: _pathKm(altPath),
        primary: false,
      ));
    }

    _currentRoutes = models;
    _isLoadingRoutes = false;
    _notify();
  }
}
