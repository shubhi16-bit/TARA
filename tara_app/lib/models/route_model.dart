import 'package:latlong2/latlong.dart';
import 'dark_zone_model.dart';

class RouteOptionModel {
  final String title;
  final String typeTag; // "FASTEST" or "SAFER (TARA RECOMMENDED)"
  final double distanceKm;
  final int durationMinutes;
  final RiskLevel riskLevel;
  final int riskScore; // 0 - 100
  final int litPercentage; // e.g. 92%
  final String footfallExposure; // "High / Active", "Isolated"
  final List<LatLng> waypoints;
  final bool isRecommended;
  final String safetySummary;

  RouteOptionModel({
    required this.title,
    required this.typeTag,
    required this.distanceKm,
    required this.durationMinutes,
    required this.riskLevel,
    required this.riskScore,
    required this.litPercentage,
    required this.footfallExposure,
    required this.waypoints,
    required this.isRecommended,
    required this.safetySummary,
  });
}
