import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
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
  int _transportMode = 0; // 0: Walk (🚶), 1: Transit (🚇), 2: Drive (🚗)

  @override
  void initState() {
    super.initState();
    final routing = Provider.of<RoutingProvider>(context, listen: false);
    _destinationController.text = routing.currentDestination;
  }

  @override
  void dispose() {
    _destinationController.dispose();
    super.dispose();
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
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 80),
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
    final currentSelectedRoute = (routes.isNotEmpty && _selectedRouteIndex < routes.length)
        ? routes[_selectedRouteIndex]
        : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // 1. Google Maps Styled Map
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: routing.currentLocation,
              initialZoom: 15.0,
              onTap: (tapPos, latLng) {
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
                    // Active route
                    if (currentSelectedRoute != null)
                      Polyline(
                        points: currentSelectedRoute.waypoints,
                        strokeWidth: 6.5,
                        color: currentSelectedRoute.isRecommended
                            ? const Color(0xFF16A34A) // Google Green for safer route
                            : const Color(0xFFEA4335), // Google Red for unlit shortcut
                      ),
                  ],
                ),
              // Google Maps Style Markers
              MarkerLayer(
                markers: [
                  // Blue Pulsing Dot for Current Location
                  Marker(
                    point: routing.currentLocation,
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
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 14)],
                    ),
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

                // Transport Mode Chips
                if (!_isSearching)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 14),
                    child: Row(
                      children: [
                        _buildTransportChip(0, Icons.directions_walk_rounded, 'Walking (Safe)'),
                        const SizedBox(width: 8),
                        _buildTransportChip(1, Icons.directions_transit_rounded, 'Transit'),
                        const SizedBox(width: 8),
                        _buildTransportChip(2, Icons.directions_car_rounded, 'Drive'),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // 3. Floating Map Controls (Right Side)
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

          // 4. Live Turn-by-Turn Navigation Mode
          if (_isNavigating)
            Positioned(
              top: 140,
              left: 14,
              right: 14,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F9D58),
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 10)],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.turn_right_rounded, color: Colors.white, size: 30),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            currentSelectedRoute?.isRecommended == true
                                ? 'Head onto Well-Lit Main Corridor'
                                : 'Caution: Shortcut with poorly lit dark zones',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Text(
                            'Continuous Streetlights Active',
                            style: TextStyle(color: Colors.white70, fontSize: 11),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white, size: 22),
                      onPressed: () => setState(() => _isNavigating = false),
                    ),
                  ],
                ),
              ),
            ),

          // 5. Route Comparison Bottom Sheet (Guarded against any overflow)
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
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          setState(() => _isNavigating = true);
                        },
                        icon: const Icon(Icons.navigation_rounded, size: 18, color: Colors.white),
                        label: Text(
                          'Start (${currentSelectedRoute?.durationMinutes ?? 15} min • ${currentSelectedRoute?.distanceKm ?? 2.1} km)',
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
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransportChip(int mode, IconData icon, String label) {
    final isSelected = _transportMode == mode;
    return GestureDetector(
      onTap: () => setState(() => _transportMode = mode),
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
                    '${route.durationMinutes}m',
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
