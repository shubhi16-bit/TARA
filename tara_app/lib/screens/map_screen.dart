import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:provider/provider.dart';
import '../theme/app_colors.dart';
import '../l10n/language_provider.dart';
import '../providers/routing_provider.dart';
import '../models/dark_zone_model.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  String _selectedFilter = 'ALL'; // ALL, DARK, SAFE

  void _showDarkZoneDetails(DarkZoneModel zone) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {

        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.primaryAction,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      zone.roadName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: zone.riskScore > 75
                          ? AppColors.riskHighBg
                          : zone.riskScore > 50
                              ? AppColors.riskMediumBg
                              : AppColors.riskLowBg,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Risk: ${zone.riskScore}/100',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: zone.riskScore > 75
                            ? AppColors.riskHigh
                            : zone.riskScore > 50
                                ? AppColors.riskMedium
                                : AppColors.riskLow,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Lighting Stats Row
              Row(
                children: [
                  _buildDetailTile(
                    'Total Lights',
                    '${zone.totalLights}',
                    Icons.wb_incandescent_outlined,
                    AppColors.textPrimary,
                  ),
                  const SizedBox(width: 8),
                  _buildDetailTile(
                    'Working',
                    '${zone.workingLights}',
                    Icons.check_circle_outline,
                    AppColors.riskLow,
                  ),
                  const SizedBox(width: 8),
                  _buildDetailTile(
                    'Faulty / Dark',
                    '${zone.faultyLights}',
                    Icons.error_outline,
                    AppColors.riskHigh,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              // Footfall exposure info
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.inputBackground,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.people_outline_rounded, size: 20, color: AppColors.textPrimary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Estimated Pedestrian Exposure',
                            style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                          ),
                          Text(
                            '${zone.estimatedFootfall} Night Footfall (${zone.activeReports} active complaints)',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.shield_outlined, size: 18),
                  label: const Text('Avoid in Night Routing'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailTile(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.inputBackground,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: color)),
            Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lang = Provider.of<LanguageProvider>(context);
    final routing = Provider.of<RoutingProvider>(context);

    final filteredZones = routing.darkZones.where((zone) {
      if (_selectedFilter == 'DARK') return zone.riskScore >= 70;
      if (_selectedFilter == 'SAFE') return zone.riskScore < 50;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              lang.tr('mapTitle'),
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              lang.tr('mapSubtitle'),
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          // OpenStreetMap Layer
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: routing.currentLocation,
              initialZoom: 15.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.hacks11.roshni',
              ),
              // Dark Zone & Safe Zone Markers
              MarkerLayer(
                markers: [
                  // User Current Location Pin
                  Marker(
                    point: routing.currentLocation,
                    width: 44,
                    height: 44,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: Colors.blue,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 3),
                            boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6)],
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Dark zone pins
                  ...filteredZones.map((zone) {
                    Color pinColor = zone.riskScore > 75
                        ? AppColors.riskHigh
                        : zone.riskScore > 50
                            ? AppColors.riskMedium
                            : AppColors.riskLow;
                    return Marker(
                      point: zone.position,
                      width: 50,
                      height: 50,
                      child: GestureDetector(
                        onTap: () => _showDarkZoneDetails(zone),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: pinColor,
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    zone.riskScore > 75 ? Icons.nightlight_round : Icons.lightbulb_rounded,
                                    size: 11,
                                    color: Colors.white,
                                  ),
                                  const SizedBox(width: 2),
                                  Text(
                                    '${zone.riskScore}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Icon(Icons.location_on_sharp, size: 24, color: pinColor),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ],
          ),

          // Top Floating Filter Chips
          Positioned(
            top: 12,
            left: 16,
            right: 16,
            child: Row(
              children: [
                _buildFilterChip('ALL', lang.tr('filterAll')),
                const SizedBox(width: 8),
                _buildFilterChip('DARK', lang.tr('filterDark')),
                const SizedBox(width: 8),
                _buildFilterChip('SAFE', lang.tr('filterSafe')),
              ],
            ),
          ),

          // Bottom Floating Legend Card
          Positioned(
            bottom: 20,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildLegendItem(AppColors.riskHigh, lang.tr('legendCritical')),
                  _buildLegendItem(AppColors.riskMedium, lang.tr('legendHigh')),
                  _buildLegendItem(AppColors.riskLow, lang.tr('legendSafe')),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedFilter == key;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedFilter = key),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryAction : Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6)],
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isSelected ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
        ),
      ],
    );
  }
}
