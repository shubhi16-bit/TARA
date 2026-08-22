enum ReportStatus { logged, inReview, inRepair, resolved }

class ReportModel {
  final String id;
  final String issueType;
  final String locationAddress;
  final double latitude;
  final double longitude;
  final String notes;
  final String? imagePath;
  final DateTime createdAt;
  ReportStatus status;

  ReportModel({
    required this.id,
    required this.issueType,
    required this.locationAddress,
    required this.latitude,
    required this.longitude,
    required this.notes,
    this.imagePath,
    required this.createdAt,
    this.status = ReportStatus.logged,
  });

  String get formattedTime {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
