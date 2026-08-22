import 'package:flutter/material.dart';
import '../models/report_model.dart';
import '../services/api_service.dart';

class ReportsProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  final List<ReportModel> _reports = [
    ReportModel(
      id: 'REP-1092',
      issueType: 'Dark Area / No Lights',
      locationAddress: 'College Road, Near Girls Hostel',
      latitude: 28.6139,
      longitude: 77.2090,
      notes: 'Road pitch dark after 9 PM. Streetlights not working.',
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      status: ReportStatus.inReview,
    ),
    ReportModel(
      id: 'REP-1088',
      issueType: 'Multiple Lights Non-Functional',
      locationAddress: 'Station Link Road, Pillar 42',
      latitude: 28.6180,
      longitude: 77.2150,
      notes: '3 poles in a row not working. Flickering since yesterday.',
      createdAt: DateTime.now().subtract(const Duration(hours: 14)),
      status: ReportStatus.inRepair,
    ),
    ReportModel(
      id: 'REP-1045',
      issueType: 'Broken Streetlight',
      locationAddress: 'Main Market Crossing, Sector 4',
      latitude: 28.6220,
      longitude: 77.2100,
      notes: 'Bulb shattered, dark shadow right at corner.',
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      status: ReportStatus.resolved,
    ),
  ];

  List<ReportModel> get reports => List.unmodifiable(_reports);

  Future<void> loadReportsFromBackend({String? userPhone}) async {
    final backendReports = await _apiService.fetchReports(userPhone: userPhone);
    if (backendReports.isNotEmpty) {
      _reports.clear();
      _reports.addAll(backendReports);
      notifyListeners();
    }
  }

  Future<void> submitReport({
    required String issueType,
    required String locationAddress,
    required double latitude,
    required double longitude,
    required String notes,
    String? imagePath,
    String? userPhone,
  }) async {
    // 1. Send to Backend API
    final serverReport = await _apiService.submitReport(
      issueType: issueType,
      locationAddress: locationAddress,
      latitude: latitude,
      longitude: longitude,
      notes: notes,
      imagePath: imagePath,
      userPhone: userPhone,
    );

    // 2. Add to Local State
    final newReport = serverReport ??
        ReportModel(
          id: 'REP-${1100 + _reports.length}',
          issueType: issueType,
          locationAddress: locationAddress.isNotEmpty ? locationAddress : 'Pinned Location ($latitude, $longitude)',
          latitude: latitude,
          longitude: longitude,
          notes: notes,
          imagePath: imagePath,
          createdAt: DateTime.now(),
          status: ReportStatus.logged,
        );

    _reports.insert(0, newReport);
    notifyListeners();
  }
}
