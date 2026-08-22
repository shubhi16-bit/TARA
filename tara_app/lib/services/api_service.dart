import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/report_model.dart';
import '../models/dark_zone_model.dart';
import 'package:latlong2/latlong.dart';
import '../config/app_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  /// API URL initialized from AppConfig
  String baseUrl = AppConfig.apiBaseUrl;

  void setBaseUrl(String newUrl) {
    baseUrl = newUrl;
  }

  // 1. Auth: Send OTP
  Future<bool> sendOtp(String phoneNumber) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/send-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone': phoneNumber}),
      ).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (e) {
      debugPrint('ApiService sendOtp error (using local mock fallback): $e');
      return true; // Fallback so UI continues during demo
    }
  }

  // 2. Auth: Verify OTP
  Future<Map<String, dynamic>?> verifyOtp(String phoneNumber, String otp) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/verify-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone': phoneNumber, 'otp': otp}),
      ).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
    } catch (e) {
      debugPrint('ApiService verifyOtp error (using local mock fallback): $e');
    }
    return {'success': true, 'token': 'mock_jwt_token_tara'};
  }

  // 3. Citizen Report: Submit Complaint with Photo
  Future<ReportModel?> submitReport({
    required String issueType,
    required String locationAddress,
    required double latitude,
    required double longitude,
    required String notes,
    int lightsDown = 1,
    String? imagePath,
    String? userPhone,
  }) async {
    try {
      if (imagePath != null && File(imagePath).existsSync()) {
        // Multipart request for image upload
        var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/reports'));
        request.fields['issueType'] = issueType;
        request.fields['location'] = locationAddress;
        request.fields['locationAddress'] = locationAddress;
        request.fields['latitude'] = latitude.toString();
        request.fields['longitude'] = longitude.toString();
        request.fields['notes'] = notes;
        request.fields['description'] = notes;
        request.fields['lightsDown'] = lightsDown.toString();
        if (userPhone != null) request.fields['userPhone'] = userPhone;

        request.files.add(await http.MultipartFile.fromPath('photo', imagePath));

        var streamedResponse = await request.send().timeout(const Duration(seconds: 8));
        var response = await http.Response.fromStream(streamedResponse);

        if (response.statusCode == 201 || response.statusCode == 200) {
          final data = jsonDecode(response.body);
          return ReportModel(
            id: data['id'] ?? data['reportId'] ?? 'REP-${DateTime.now().millisecondsSinceEpoch % 10000}',
            issueType: issueType,
            locationAddress: locationAddress,
            latitude: latitude,
            longitude: longitude,
            notes: notes,
            imagePath: imagePath,
            createdAt: DateTime.now(),
            status: ReportStatus.logged,
          );
        }
      } else {
        // Standard JSON request
        final res = await http.post(
          Uri.parse('$baseUrl/reports'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'issueType': issueType,
            'type': issueType,
            'location': locationAddress,
            'locationAddress': locationAddress,
            'latitude': latitude,
            'longitude': longitude,
            'notes': notes,
            'description': notes,
            'lightsDown': lightsDown,
            'userPhone': userPhone,
          }),
        ).timeout(const Duration(seconds: 4));

        if (res.statusCode == 201 || res.statusCode == 200) {
          final data = jsonDecode(res.body);
          return ReportModel(
            id: data['id'] ?? data['reportId'] ?? 'REP-${DateTime.now().millisecondsSinceEpoch % 10000}',
            issueType: issueType,
            locationAddress: locationAddress,
            latitude: latitude,
            longitude: longitude,
            notes: notes,
            createdAt: DateTime.now(),
            status: ReportStatus.logged,
          );
        }
      }
    } catch (e) {
      debugPrint('ApiService submitReport error: $e');
    }
    return null;
  }

  // 4. Fetch Citizen Reports from Backend
  Future<List<ReportModel>> fetchReports({String? userPhone}) async {
    try {
      final url = userPhone != null
          ? Uri.parse('$baseUrl/reports?phone=$userPhone')
          : Uri.parse('$baseUrl/reports');
      final res = await http.get(url).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((item) {
          ReportStatus st = ReportStatus.logged;
          if (item['status'] == 'inReview') st = ReportStatus.inReview;
          if (item['status'] == 'inRepair') st = ReportStatus.inRepair;
          if (item['status'] == 'resolved') st = ReportStatus.resolved;

          return ReportModel(
            id: item['id'] ?? 'REP-000',
            issueType: item['issueType'] ?? 'Streetlight Issue',
            locationAddress: item['location'] ?? item['locationAddress'] ?? 'Nearby Street',
            latitude: (item['latitude'] as num?)?.toDouble() ?? 28.6139,
            longitude: (item['longitude'] as num?)?.toDouble() ?? 77.2090,
            notes: item['notes'] ?? '',
            imagePath: item['imageUrl'],
            createdAt: item['createdAt'] != null ? DateTime.parse(item['createdAt']) : DateTime.now(),
            status: st,
          );
        }).toList();
      }
    } catch (e) {
      debugPrint('ApiService fetchReports error: $e');
    }
    return [];
  }

  // 5. Fetch Dark Zones from Backend Risk Engine
  Future<List<DarkZoneModel>> fetchDarkZones() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/dark-zones')).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((item) {
          RiskLevel level = RiskLevel.medium;
          if (item['riskLevel'] == 'critical') level = RiskLevel.critical;
          if (item['riskLevel'] == 'high') level = RiskLevel.high;
          if (item['riskLevel'] == 'low') level = RiskLevel.low;

          return DarkZoneModel(
            id: item['id'] ?? 'DZ-0',
            roadName: item['roadName'] ?? 'Arterial Road',
            position: LatLng(
              (item['latitude'] as num?)?.toDouble() ?? 28.6139,
              (item['longitude'] as num?)?.toDouble() ?? 77.2090,
            ),
            riskLevel: level,
            riskScore: (item['riskScore'] as num?)?.toInt() ?? 50,
            totalLights: (item['totalLights'] as num?)?.toInt() ?? 10,
            workingLights: (item['workingLights'] as num?)?.toInt() ?? 5,
            faultyLights: (item['faultyLights'] as num?)?.toInt() ?? 5,
            estimatedFootfall: item['estimatedFootfall'] ?? 'Moderate',
            activeReports: (item['activeReports'] as num?)?.toInt() ?? 0,
          );
        }).toList();
      }
    } catch (e) {
      debugPrint('ApiService fetchDarkZones error: $e');
    }
    return [];
  }
}
