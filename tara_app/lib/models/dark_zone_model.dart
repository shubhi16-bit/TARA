import 'package:latlong2/latlong.dart';

enum RiskLevel { low, medium, high, critical }

class DarkZoneModel {
  final String id;
  final String roadName;
  final LatLng position;
  final RiskLevel riskLevel;
  final int riskScore; // 0 - 100
  final int totalLights;
  final int workingLights;
  final int faultyLights;
  final String estimatedFootfall; // High, Medium, Low
  final int activeReports;

  DarkZoneModel({
    required this.id,
    required this.roadName,
    required this.position,
    required this.riskLevel,
    required this.riskScore,
    required this.totalLights,
    required this.workingLights,
    required this.faultyLights,
    required this.estimatedFootfall,
    required this.activeReports,
  });
}
