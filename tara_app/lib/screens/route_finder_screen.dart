import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../theme/app_colors.dart';
import '../l10n/language_provider.dart';
import '../providers/routing_provider.dart';
import '../models/route_model.dart';
import '../models/dark_zone_model.dart';

class RouteFinderScreen extends StatefulWidget {
  const RouteFinderScreen({super.key});

  @override
  State<RouteFinderScreen> createState() => _RouteFinderScreenState();
}

class _RouteFinderScreenState extends State<RouteFinderScreen> {
  final TextEditingController _destinationController = TextEditingController();
  final MapController _mapController = MapController();
  int _selectedRouteIndex = 1; // Default to Safer Route (TARA Recommended)
  bool _isNavigating = false;
  bool _isSearching = false;

  // Live navigation state (Google-Maps-style)
  StreamSubscription<Position>? _navPosSub;
  Timer? _navTimer;
  RouteOptionModel? _navRoute;
  final List<double> _cum = []; // cumulative metres at each waypoint
  double _totalMeters = 0;
  double _navDist = 0; // metres travelled along the route
  LatLng? _navPos; // walker position shown on the map
  int _navStepIndex = 0; // step the user is currently on
  double _remainingKm = 0;
  int _remainingMin = 0;
  String _lastRouteSig = '';
  LatLng? _lastAutoCenter;

  @override
  void initState() {
    super.initState();
    final routing = Provider.of<RoutingProvider>(context, listen: false);
    _destinationController.text = routing.currentDestination;
    routing.addListener(_onRoutingChanged);
  }

  @override
  void dispose() {
    _navTimer?.cancel();
    _navPosSub?.cancel();
    _destinationController.dispose();
    super.dispose();
  }

  /// Auto-fit camera whenever a new route arrives.
  void _onRoutingChanged() {
    if (!mounted || _isNavigating) return;
    final r = Provider.of<RoutingProvider>(context, listen: false);
    final routes = r.currentRoutes;

    // Keep the map centred on the real GPS position until a route is planned.
    final loc = r.currentLocation;
    if (!_isSearching &&
        routes.isEmpty &&
        r.hasLocationFix &&
        (_lastAutoCenter == null || Distance()(loc, _lastAutoCenter!) > 120)) {
      _lastAutoCenter = loc;
      try {
        _mapController.move(loc, 16.0);
      } catch (_) {}
    }

    final sig =
        '${r.destinationLocation}|${routes.length}|${routes.isEmpty ? '' : routes[0].waypoints.length}';
    if (routes.isNotEmpty && sig != _lastRouteSig) {
      _lastRouteSig = sig;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_isNavigating) _fitMapToRoute();
      });
    }
  }

  // ---------- Navigation engine ----------

  String _fmtDist(double meters) =>
      meters >= 950 ? '${(meters / 1000).toStringAsFixed(1)} km' : '${meters.round()} m';

  String _fmtDur(int mins) {
    if (mins < 60) return '$mins min';
    final h = mins ~/ 60;
    final m = mins % 60;
    return m == 0 ? '${h}h' : '${h}h ${m.toString().padLeft(2, '0')}m';
  }

  LatLng _interpAlong(double dist) {
    final pts = _navRoute!.waypoints;
    if (_cum.isEmpty || pts.isEmpty) return routing0();
    for (var i = 1; i < _cum.length; i++) {
      if (_cum[i] >= dist || i == _cum.length - 1) {
        final segLen = _cum[i] - _cum[i - 1];
        final t = segLen <= 0 ? 0.0 : ((dist - _cum[i - 1]) / segLen).clamp(0.0, 1.0);
        return LatLng(
          pts[i - 1].latitude + (pts[i].latitude - pts[i - 1].latitude) * t,
          pts[i - 1].longitude + (pts[i].longitude - pts[i - 1].longitude) * t,
        );
      }
    }
    return pts.last;
  }

  LatLng routing0() => Provider.of<RoutingProvider>(context, listen: false).currentLocation;

  int _stepIndexForDist(double dist) {
    final steps = _navRoute?.steps ?? const [];
    var idx = 0;
    for (var i = 0; i < steps.length; i++) {
      final si = steps[i].startIndex.clamp(0, _cum.isEmpty ? 0 : _cum.length - 1);
      if (_cum.isNotEmpty && _cum[si] <= dist) idx = i;
    }
    return idx;
  }

  double _stepBoundary(int stepIdx) {
    final steps = _navRoute!.steps;
    if (stepIdx >= steps.length || _cum.isEmpty) return _totalMeters;
    return _cum[steps[stepIdx].startIndex.clamp(0, _cum.length - 1)];
  }

  void _refreshNavUi() {
    if (_navRoute == null || !mounted) return;
    final remMeters = (_totalMeters - _navDist).clamp(0.0, double.infinity);
    final frac = _totalMeters > 0 ? 1 - (_navDist / _totalMeters) : 0.0;
    setState(() {
      _navStepIndex = _stepIndexForDist(_navDist);
      _remainingKm = double.parse((remMeters / 1000).toStringAsFixed(1));
      _remainingMin = ((_navRoute!.durationMinutes * frac).round()).clamp(0, 999);
      _navPos = _interpAlong(_navDist);
    });
    try {
      _mapController.move(_navPos!, 17.5);
    } catch (_) {}
  }

  void _startNavigation(RouteOptionModel route) {
    final d = Distance();
    _navRoute = route;
    _cum
      ..clear()
      ..add(0);
    for (var i = 1; i < route.waypoints.length; i++) {
      _cum.add(_cum.last + d(route.waypoints[i - 1], route.waypoints[i]));
    }
    _totalMeters = _cum.isNotEmpty ? _cum.last : 0;
    _navDist = 0;
    _navPos = route.waypoints.isNotEmpty ? route.waypoints.first : null;

    setState(() {
      _isNavigating = true;
      _isSearching = false;
    });
    _refreshNavUi();

    // Simulated walker keeps guidance moving even without GPS updates,
    // real GPS below jumps progress forward the moment you actually walk.
    _navTimer?.cancel();
    _navTimer = Timer.periodic(const Duration(milliseconds: 600), (_) {
      if (!mounted || _navRoute == null) return;
      if (_navDist >= _totalMeters - 1) {
        _onArrived();
        return;
      }
      _navDist += 0.85; // ~1.4 m/s walking pace
      _refreshNavUi();
    });

    _navPosSub?.cancel();
    _navPosSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen((pos) {
      if (!mounted || _navRoute == null) return;
      final me = LatLng(pos.latitude, pos.longitude);
      final shown = _navPos ?? me;
      if (Distance()(shown, me) < 25) return; // ignore small drift
      final nearestIdx = RoutingProvider.nearestWaypointIndex(_navRoute!.waypoints, me);
      final projected = nearestIdx < _cum.length ? _cum[nearestIdx] : _navDist;
      if (projected > _navDist) _navDist = projected; // never go backwards
      _navPos = me;
      _refreshNavUi();
    }, onError: (_) {});
  }

  void _onArrived() {
    _navTimer?.cancel();
    _navTimer = null;
    _navPosSub?.cancel();
    _navPosSub = null;
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('You have arrived at your destination'),
        backgroundColor: Color(0xFF16A34A),
      ),
    );
    setState(() => _isNavigating = false);
  }

  void _stopNavigation() {
    _navTimer?.cancel();
    _navTimer = null;
    _navPosSub?.cancel();
    _navPosSub = null;
    if (mounted) setState(() => _isNavigating = false);
  }

  void _showStepsSheet(BuildContext ctx, RouteOptionModel route) {
    showModalBottomSheet(
      context: ctx,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(sheetCtx).size.height * 0.65),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.secondaryActionBorder,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
                child: Row(
                  children: [
                    Icon(route.isRecommended ? Icons.verified_user_rounded : Icons.bolt_rounded,
                        color: route.isRecommended ? const Color(0xFF16A34A) : const Color(0xFFEA4335), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        route.title,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                      ),
                    ),
                    Text('${route.distanceKm} km • ${_fmtDur(route.durationMinutes)}',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                  ],
                ),
              ),
              const Divider(height: 1, color: AppColors.borderSubtle),
              Flexible(
                child: route.steps.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text('Detailed turn-by-turn unavailable for this route.',
                            style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      )
                    : ListView.separated(
                        shrinkWrap: true,
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        itemCount: route.steps.length,
                        separatorBuilder: (_, _) =>
                            const Divider(height: 1, indent: 66, color: AppColors.borderSubtle),
                        itemBuilder: (_, i) {
                          final s = route.steps[i];
                          return ListTile(
                            dense: true,
                            leading: CircleAvatar(
                              radius: 17,
                              backgroundColor: const Color(0xFFE8F0FE),
                              child: Icon(s.icon, size: 19, color: const Color(0xFF1A73E8)),
                            ),
                            title: Text(
                              s.instruction,
                              style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
                            ),
                            trailing: Text(
                              _fmtDist(s.distanceMeters),
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _onDestinationSubmitted(String query) {
    if (query.trim().isEmpty) return;
    setState(() => _isSearching = false);
    final routing = Provider.of<RoutingProvider>(context, listen: false);
    routing.calculateRealRoutes(query.trim()).then((_) {
      _fitMapToRoute();
    });
  }

  void _selectSuggestion(PlaceSuggestion item) {
    _destinationController.text = item.name;
    setState(() => _isSearching = false);
    final routing = Provider.of<RoutingProvider>(context, listen: false);
    routing.calculateRealRoutes(item.name, item.position).then((_) {
      _fitMapToRoute();
    });
  }

  void _fitMapToRoute() {
    final routing = Provider.of<RoutingProvider>(context, listen: false);
    if (routing.currentRoutes.isNotEmpty && _selectedRouteIndex < routing.currentRoutes.length) {
      final points = routing.currentRoutes[_selectedRouteIndex].waypoints;
      if (points.length >= 2) {
        try {
          final bounds = LatLngBounds.fromPoints([
            routing.currentLocation,
            routing.destinationLocation,
            ...points,
          ]);
          _mapController.fitCamera(
            CameraFit.bounds(
              bounds: bounds,
              padding: const EdgeInsets.symmetric(horizontal: 50, vertical: 110),
              maxZoom: 16.5,
            ),
          );
        } catch (_) {
          _mapController.move(routing.currentLocation, 15.0);
        }
      }
    }
  }

  void _showMapLayerSelector(BuildContext context, RoutingProvider routing) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.secondaryActionBorder,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Map Style',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  _buildLayerOption('Google Standard', Icons.map_outlined, MapStyleType.googleStandard, routing, ctx),
                  const SizedBox(width: 12),
                  _buildLayerOption('Satellite', Icons.satellite_alt_outlined, MapStyleType.googleSatellite, routing, ctx),
                  const SizedBox(width: 12),
                  _buildLayerOption('Terrain', Icons.terrain_outlined, MapStyleType.googleTerrain, routing, ctx),
                ],
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLayerOption(String name, IconData icon, MapStyleType type, RoutingProvider routing, BuildContext ctx) {
    final isSelected = routing.mapStyle == type;
    return Expanded(
      child: InkWell(
        onTap: () {
          routing.setMapStyle(type);
          Navigator.pop(ctx);
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.tagDoctorBg : AppColors.inputBackground,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? AppColors.tagDoctorText : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, size: 24, color: isSelected ? AppColors.tagDoctorText : AppColors.textPrimary),
              const SizedBox(height: 6),
              Text(
                name,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? AppColors.tagDoctorText : AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lang = Provider.of<LanguageProvider>(context);
    final routing = Provider.of<RoutingProvider>(context);
    final routes = routing.currentRoutes;
    if (routes.isNotEmpty && _selectedRouteIndex >= routes.length) {
      _selectedRouteIndex = routes.length - 1;
    }
    final currentSelectedRoute =
        routes.isNotEmpty ? routes[_selectedRouteIndex.clamp(0, routes.length - 1)] : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // 1. Google Maps Styled Map
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: routing.currentLocation,
              initialZoom: 16.0,
              onTap: (tapPos, latLng) {
                if (_isNavigating) return;
                _destinationController.text = 'Dropped Pin (${latLng.latitude.toStringAsFixed(3)}, ${latLng.longitude.toStringAsFixed(3)})';
                routing.calculateRealRoutes(_destinationController.text, latLng).then((_) {
                  _fitMapToRoute();
                });
              },
            ),
            children: [
              TileLayer(
                urlTemplate: routing.tileUrl,
                subdomains: routing.tileSubdomains,
                fallbackUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.hacks11.roshni',
                retinaMode: true, // crisp @2x tiles on phone screens
              ),
              // Route Polylines
              if (routes.isNotEmpty)
                PolylineLayer(
                  polylines: [
                    // Inactive route
                    Polyline(
                      points: routes[_selectedRouteIndex == 0 ? (routes.length > 1 ? 1 : 0) : 0].waypoints,
                      strokeWidth: 5.0,
                      color: Colors.grey.withValues(alpha: 0.6),
                    ),
                    // Active route (white casing underneath, Google-style)
                    if (currentSelectedRoute != null) ...[
                      Polyline(
                        points: currentSelectedRoute.waypoints,
                        strokeWidth: 10.0,
                        color: Colors.white,
                      ),
                      Polyline(
                        points: currentSelectedRoute.waypoints,
                        strokeWidth: 6.5,
                        color: currentSelectedRoute.isRecommended
                            ? const Color(0xFF16A34A)
                            : const Color(0xFFEA4335),
                      ),
                    ],
                  ],
                ),
              // Google Maps Style Markers
              MarkerLayer(
                markers: [
                  // Blue Pulsing Dot for Current / Walking Position
                  Marker(
                    point: (_isNavigating && _navPos != null) ? _navPos! : routing.currentLocation,
                    width: 36,
                    height: 36,
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF4285F4).withValues(alpha: 0.2),
                      ),
                      child: Center(
                        child: Container(
                          width: 18,
                          height: 18,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF1A73E8),
                            border: Border.all(color: Colors.white, width: 2.5),
                            boxShadow: const [
                              BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Red Teardrop Pin for Destination
                  if (routing.hasDestination)
                    Marker(
                      point: routing.destinationLocation,
                      width: 40,
                      height: 40,
                      child: Column(
                        children: const [
                          Icon(
                            Icons.location_on,
                            color: Color(0xFFEA4335),
                            size: 36,
                            shadows: [
                              Shadow(color: Colors.black38, blurRadius: 6, offset: Offset(0, 2)),
                            ],
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ),

          // 2. Floating Google Maps Search Card
          if (!_isNavigating)
            SafeArea(
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x1F000000),
                        blurRadius: 14,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Origin Row
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: Color(0xFF1A73E8),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                routing.currentAddress,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            InkWell(
                              onTap: () {
                                routing.fetchCurrentLocation().then((_) => _fitMapToRoute());
                              },
                              child: const Icon(Icons.my_location, size: 18, color: Color(0xFF1A73E8)),
                            ),
                          ],
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 32),
                        child: Divider(height: 1, color: AppColors.borderSubtle),
                      ),
                      // Destination Row
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 6, 8, 10),
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                shape: BoxShape.rectangle,
                                color: Color(0xFFEA4335),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: _destinationController,
                                onChanged: (val) {
                                  setState(() => _isSearching = val.trim().isNotEmpty);
                                  routing.searchDestination(val);
                                },
                                onSubmitted: _onDestinationSubmitted,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                                decoration: const InputDecoration(
                                  hintText: 'Search any destination or place...',
                                  isDense: true,
                                  contentPadding: EdgeInsets.symmetric(horizontal: 0, vertical: 8),
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  fillColor: Colors.transparent,
                                ),
                              ),
                            ),
                            if (_destinationController.text.isNotEmpty)
                              IconButton(
                                icon: const Icon(Icons.clear_rounded, size: 18, color: AppColors.textMuted),
                                onPressed: () {
                                  _destinationController.clear();
                                  setState(() => _isSearching = false);
                                },
                              ),
                            IconButton(
                              icon: const Icon(Icons.search_rounded, color: Color(0xFF1A73E8), size: 22),
                              onPressed: () => _onDestinationSubmitted(_destinationController.text),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Live Search Dropdown Suggestions
                if (_isSearching && routing.destinationSuggestions.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 14),
                    constraints: const BoxConstraints(maxHeight: 220),
                    decoration: const BoxDecoration(
                      borderRadius: BorderRadius.vertical(bottom: Radius.circular(18)),
                      boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 14)],
                    ),
                    child: Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      clipBehavior: Clip.antiAlias,
                      child: ListView.separated(
                      shrinkWrap: true,
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      itemCount: routing.destinationSuggestions.length,
                      separatorBuilder: (_, _) => const Divider(height: 1, color: AppColors.borderSubtle),
                      itemBuilder: (ctx, i) {
                        final item = routing.destinationSuggestions[i];
                        return ListTile(
                          dense: true,
                          leading: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(
                              color: AppColors.inputBackground,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(item.icon, size: 18, color: const Color(0xFF1A73E8)),
                          ),
                          title: Text(
                            item.name,
                            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            item.address,
                            style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          onTap: () => _selectSuggestion(item),
                        );
                      },
                      ),
                    ),
                  ),

                // Transport Mode Chips
                if (!_isSearching)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 14),
                    child: Row(
                      children: [
                        _buildTransportChip(routing, 0, Icons.directions_walk_rounded, 'Walk'),
                        const SizedBox(width: 8),
                        _buildTransportChip(routing, 1, Icons.directions_car_rounded, 'Drive'),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // 3. Floating Map Controls (Right Side)
          if (!_isNavigating)
            Positioned(
              right: 16,
              bottom: 270,
            child: Column(
              children: [
                FloatingActionButton.small(
                  heroTag: 'layersBtn',
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.textPrimary,
                  elevation: 4,
                  onPressed: () => _showMapLayerSelector(context, routing),
                  child: const Icon(Icons.layers_outlined, size: 20),
                ),
                const SizedBox(height: 10),
                FloatingActionButton.small(
                  heroTag: 'recenterBtn',
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF1A73E8),
                  elevation: 4,
                  onPressed: () {
                    routing.fetchCurrentLocation().then((_) {
                      _mapController.move(routing.currentLocation, 16.0);
                    });
                  },
                  child: const Icon(Icons.my_location_rounded, size: 20),
                ),
              ],
            ),
          ),

          // 4. Live Turn-by-Turn Navigation Mode (Google-Maps-style)
          if (_isNavigating && _navRoute != null)
            Positioned(
              top: 0,
              left: 12,
              right: 12,
              child: SafeArea(
                bottom: false,
                child: Builder(builder: (ctx) {
                  final steps = _navRoute!.steps;
                  final hasNext = steps.isNotEmpty && _navStepIndex + 1 < steps.length;
                  final nextStep = hasNext ? steps[_navStepIndex + 1] : null;
                  final distToTurn = hasNext
                      ? (_stepBoundary(_navStepIndex + 1) - _navDist).clamp(0.0, double.infinity)
                      : (_totalMeters - _navDist).clamp(0.0, double.infinity);
                  return Container(
                    padding: const EdgeInsets.fromLTRB(14, 14, 6, 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: const [
                        BoxShadow(color: Colors.black26, blurRadius: 12, offset: Offset(0, 4)),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: const BoxDecoration(
                            color: Color(0xFFE8F0FE),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            nextStep?.icon ?? Icons.flag_rounded,
                            color: const Color(0xFF1A73E8),
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                distToTurn > 5 ? 'In ${_fmtDist(distToTurn)}' : 'Arrive',
                                style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.textPrimary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                nextStep?.instruction ?? 'at your destination',
                                style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textMuted),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        if (steps.isNotEmpty)
                          IconButton(
                            tooltip: 'All steps',
                            icon: const Icon(Icons.format_list_bulleted_rounded,
                                color: Color(0xFF1A73E8), size: 22),
                            onPressed: () => _showStepsSheet(ctx, _navRoute!),
                          ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: AppColors.textMuted, size: 22),
                          onPressed: _stopNavigation,
                        ),
                      ],
                    ),
                  );
                }),
              ),
            ),

          // 5a. Live Navigation Bottom Bar
          if (_isNavigating && currentSelectedRoute != null)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: EdgeInsets.fromLTRB(16, 10, 12, MediaQuery.of(context).padding.bottom + 12),
                decoration: const BoxDecoration(
                  color: Color(0xFF202124),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                  boxShadow: [BoxShadow(color: Colors.black45, blurRadius: 14, offset: Offset(0, -3))],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.directions_walk_rounded, color: Color(0xFF8AB4F8), size: 22),
                        const SizedBox(width: 8),
                        Text(
                          '${_fmtDur(_remainingMin)} • $_remainingKm km left',
                          style: const TextStyle(
                              color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                        ),
                        const Spacer(),
                        TextButton.icon(
                          onPressed: _stopNavigation,
                          style: TextButton.styleFrom(foregroundColor: const Color(0xFF8AB4F8)),
                          icon: const Icon(Icons.close_rounded, size: 18),
                          label: const Text('Exit', style: TextStyle(fontWeight: FontWeight.w800)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: _totalMeters <= 0
                            ? null
                            : (_navDist / _totalMeters).clamp(0.0, 1.0),
                        minHeight: 6,
                        backgroundColor: Colors.white24,
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF8AB4F8)),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // 5b. Route Comparison Bottom Sheet
          if (!_isNavigating)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                  boxShadow: [
                    BoxShadow(color: Color(0x14000000), blurRadius: 16, offset: Offset(0, -4)),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.secondaryActionBorder,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    if (routing.isLoadingRoutes)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 22),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2.4),
                            ),
                            SizedBox(width: 12),
                            Text('Finding best routes...',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
                          ],
                        ),
                      )
                    else if (routing.routeError != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Text(
                          routing.routeError!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.riskHigh),
                        ),
                      )
                    else if (routes.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Column(
                          children: [
                            Icon(Icons.search_rounded, size: 30, color: AppColors.textMuted.withValues(alpha: 0.6)),
                            const SizedBox(height: 8),
                            const Text(
                              'Search a destination above or tap the map to plan a safe route.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                      ),

                    if (routes.isNotEmpty) ...[
                      // Route 1: TARA Safer Route (Recommended)
                      _buildRouteCard(
                        route: routes.length > 1 ? routes[1] : routes[0],
                        index: routes.length > 1 ? 1 : 0,
                        isSelected: _selectedRouteIndex == (routes.length > 1 ? 1 : 0),
                        lang: lang,
                      ),
                      const SizedBox(height: 8),

                      // Route 0: Fastest Route (Unlit Shortcut)
                      if (routes.length > 1)
                        _buildRouteCard(
                          route: routes[0],
                          index: 0,
                          isSelected: _selectedRouteIndex == 0,
                          lang: lang,
                        ),
                      const SizedBox(height: 12),

                      // Start Navigation Button
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              child: ElevatedButton.icon(
                                onPressed: currentSelectedRoute != null
                                    ? () => _startNavigation(currentSelectedRoute)
                                    : null,
                                icon: const Icon(Icons.navigation_rounded, size: 18, color: Colors.white),
                                label: Text(
                                  'Start (${_fmtDur(currentSelectedRoute?.durationMinutes ?? 0)} • ${currentSelectedRoute?.distanceKm ?? 0} km)',
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF1A73E8),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: const StadiumBorder(),
                                  elevation: 0,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          if (currentSelectedRoute != null && currentSelectedRoute.steps.isNotEmpty)
                            FloatingActionButton.small(
                              heroTag: 'stepsBtn',
                              backgroundColor: AppColors.inputBackground,
                              foregroundColor: const Color(0xFF1A73E8),
                              elevation: 0,
                              onPressed: () => _showStepsSheet(context, currentSelectedRoute),
                              child: const Icon(Icons.format_list_bulleted_rounded, size: 20),
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTransportChip(RoutingProvider routing, int mode, IconData icon, String label) {
    final isSelected = routing.travelMode == mode;
    return GestureDetector(
      onTap: () => routing.setTravelMode(mode),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1A73E8) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 6)],
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: isSelected ? Colors.white : AppColors.textPrimary),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isSelected ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRouteCard({
    required RouteOptionModel route,
    required int index,
    required bool isSelected,
    required LanguageProvider lang,
  }) {
    Color riskColor = route.riskLevel == RiskLevel.low ? const Color(0xFF16A34A) : const Color(0xFFEA4335);
    Color riskBg = route.riskLevel == RiskLevel.low ? AppColors.riskLowBg : AppColors.riskHighBg;

    return InkWell(
      onTap: () {
        setState(() => _selectedRouteIndex = index);
        _fitMapToRoute();
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.background : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? const Color(0xFF1A73E8) : AppColors.borderSubtle,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // Left: Duration & Distance
            SizedBox(
              width: 65,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _fmtDur(route.durationMinutes),
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: route.isRecommended ? const Color(0xFF16A34A) : AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    '${route.distanceKm} km',
                    style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Middle: Title & Lighting percentage
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          route.title,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (route.isRecommended) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.tagSchoolBg,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'SAFER',
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppColors.tagSchoolText),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Text(
                        '💡 ${route.litPercentage}% Lit',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: riskColor),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          route.isRecommended ? '• Well-Lit' : '• Dark Stretch',
                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 6),
            // Right: Risk Tag Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: riskBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                route.riskLevel == RiskLevel.low ? '🟢 Safe' : '⚠️ Risk',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: riskColor),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
