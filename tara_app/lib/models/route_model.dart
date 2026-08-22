import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'dark_zone_model.dart';

/// One turn-by-turn maneuver (like a Google Maps direction step)
class RouteStepModel {
  final String instruction;
  final double distanceMeters;
  final int durationSeconds;
  final String maneuverType; // depart / turn / roundabout / arrive ...
  final String maneuverModifier; // left / right / straight ...
  final String roadName;
  final LatLng point;
  final int startIndex; // index into route waypoints where step begins

  const RouteStepModel({
    required this.instruction,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.maneuverType,
    required this.maneuverModifier,
    required this.roadName,
    required this.point,
    this.startIndex = 0,
  });

  IconData get icon {
    final m = maneuverModifier.toLowerCase();
    switch (maneuverType) {
      case 'depart':
        return Icons.near_me_rounded;
      case 'arrive':
        return Icons.flag_rounded;
      case 'roundabout':
      case 'rotary':
      case 'exit roundabout':
      case 'exit rotary':
        return Icons.roundabout_right_rounded;
      case 'merge':
        return Icons.merge_rounded;
      case 'fork':
        return Icons.call_split_rounded;
      case 'on ramp':
      case 'off ramp':
        return Icons.alt_route_rounded;
    }
    if (m.contains('uturn')) return Icons.u_turn_left_rounded;
    if (m.contains('sharp left')) return Icons.turn_sharp_left_rounded;
    if (m.contains('sharp right')) return Icons.turn_sharp_right_rounded;
    if (m.contains('slight left')) return Icons.turn_slight_left_rounded;
    if (m.contains('slight right')) return Icons.turn_slight_right_rounded;
    if (m == 'left') return Icons.turn_left_rounded;
    if (m == 'right') return Icons.turn_right_rounded;
    if (m == 'straight' || m.isEmpty) {
      return maneuverType == 'continue' || maneuverType == 'new name'
          ? Icons.arrow_upward_rounded
          : Icons.straighten_rounded;
    }
    return Icons.arrow_upward_rounded;
  }
}

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
  final List<RouteStepModel> steps;

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
    this.steps = const [],
  });
}
