import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_colors.dart';
import '../l10n/language_provider.dart';
import '../providers/reports_provider.dart';
import '../models/report_model.dart';

class MyReportsScreen extends StatelessWidget {
  const MyReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lang = Provider.of<LanguageProvider>(context);
    final reportsProvider = Provider.of<ReportsProvider>(context);
    final reports = reportsProvider.reports;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              lang.tr('myReportsTitle'),
              style: const TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            Text(
              lang.tr('myReportsSubtitle'),
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
        toolbarHeight: 65,
      ),
      body: reports.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.inputBackground,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.assignment_outlined, size: 48, color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 16),
                  const Text('No reports logged yet', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: reports.length,
              itemBuilder: (context, index) {
                final report = reports[index];
                return _buildReportItem(report, lang);
              },
            ),
    );
  }

  Widget _buildReportItem(ReportModel report, LanguageProvider lang) {
    Color statusBg;
    Color statusText;
    String statusLabel;

    switch (report.status) {
      case ReportStatus.inReview:
        statusBg = AppColors.riskMediumBg;
        statusText = AppColors.riskMedium;
        statusLabel = 'In Review';
        break;
      case ReportStatus.inRepair:
        statusBg = AppColors.tagDoctorBg;
        statusText = AppColors.tagDoctorText;
        statusLabel = lang.tr('statusInRepair');
        break;
      case ReportStatus.resolved:
        statusBg = AppColors.riskLowBg;
        statusText = AppColors.riskLow;
        statusLabel = lang.tr('statusResolved');
        break;
      case ReportStatus.logged:
        statusBg = AppColors.inputBackground;
        statusText = AppColors.textSecondary;
        statusLabel = lang.tr('statusPending');
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.borderSubtle),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                report.id,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.textMuted),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: statusText),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            report.issueType,
            style: const TextStyle(
              fontSize: 16.5,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 15, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  report.locationAddress,
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),

          // Attached Photo Thumbnail if available
          if (report.imagePath != null && File(report.imagePath!).existsSync()) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Image.file(
                File(report.imagePath!),
                height: 140,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
          ],

          if (report.notes.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              report.notes,
              style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary, fontStyle: FontStyle.italic),
            ),
          ],
          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.borderSubtle),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.tagSchoolBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Priority Queued',
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.tagSchoolText),
                ),
              ),
              Text(
                report.formattedTime,
                style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
