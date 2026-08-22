import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../theme/app_colors.dart';
import '../l10n/language_provider.dart';
import '../providers/reports_provider.dart';
import '../providers/routing_provider.dart';

class ReportIssueScreen extends StatefulWidget {
  final VoidCallback? onReportSubmitted;

  const ReportIssueScreen({super.key, this.onReportSubmitted});

  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen> {
  int _selectedIssueTypeIndex = 0;
  final TextEditingController _notesController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  XFile? _selectedImage;
  bool _isSubmitting = false;

  final List<String> _issueKeys = [
    'brokenLight',
    'darkArea',
    'multipleLights',
  ];

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 85,
      );
      if (photo != null) {
        setState(() {
          _selectedImage = photo;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not access camera/gallery: $e')),
        );
      }
    }
  }

  void _showImageSourcePicker(LanguageProvider lang) {
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
            children: [
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.secondaryActionBorder,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                lang.tr('takePhoto'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: AppColors.tagDoctorBg,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: AppColors.tagDoctorText, size: 20),
                ),
                title: Text(lang.tr('camera'), style: const TextStyle(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: AppColors.tagSchoolBg,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: AppColors.tagSchoolText, size: 20),
                ),
                title: Text(lang.tr('gallery'), style: const TextStyle(fontWeight: FontWeight.w600)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.gallery);
                },
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lang = Provider.of<LanguageProvider>(context);
    final reportsProvider = Provider.of<ReportsProvider>(context);
    final routing = Provider.of<RoutingProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              lang.tr('reportTitle'),
              style: const TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            Text(
              lang.tr('reportSubtitle'),
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
        toolbarHeight: 65,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // 1. Auto-Attached GPS Banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderSubtle),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x06000000),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: AppColors.tagSchoolBg,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.gps_fixed_rounded, color: AppColors.tagSchoolText, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lang.tr('attachLocation'),
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.tagSchoolText),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        routing.currentAddress,
                        style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, size: 18, color: AppColors.textSecondary),
                  onPressed: () => routing.fetchCurrentLocation(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. Photo Attachment Section (Take a photo)
          Text(
            lang.tr('takePhoto'),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.inputLabel),
          ),
          const SizedBox(height: 8),
          if (_selectedImage == null)
            InkWell(
              onTap: () => _showImageSourcePicker(lang),
              borderRadius: BorderRadius.circular(18),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.secondaryActionBorder, width: 1.5),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        color: AppColors.inputBackground,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.add_a_photo_outlined, size: 26, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      lang.tr('takePhoto'),
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Camera or Gallery',
                      style: TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
            )
          else
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Image.file(
                      File(_selectedImage!.path),
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _showImageSourcePicker(lang),
                          icon: const Icon(Icons.change_circle_outlined, size: 16),
                          label: Text(lang.tr('retakePhoto')),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, color: AppColors.emergencyTitle),
                        onPressed: () => setState(() => _selectedImage = null),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          const SizedBox(height: 18),

          // 3. Issue Type Selector
          Text(
            lang.tr('issueType'),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.inputLabel),
          ),
          const SizedBox(height: 8),
          Column(
            children: List.generate(_issueKeys.length, (index) {
              final isSelected = _selectedIssueTypeIndex == index;
              final issueLabel = lang.tr(_issueKeys[index]);
              return Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: InkWell(
                  onTap: () => setState(() => _selectedIssueTypeIndex = index),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: isSelected ? Colors.white : Colors.white70,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? AppColors.primaryAction : AppColors.borderSubtle,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          index == 0
                              ? Icons.lightbulb_outline_rounded
                              : index == 1
                                  ? Icons.nightlight_round
                                  : Icons.highlight_off_rounded,
                          size: 20,
                          color: isSelected ? AppColors.emergencyButton : AppColors.textSecondary,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            issueLabel,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isSelected ? AppColors.primaryAction : Colors.transparent,
                            border: Border.all(
                              color: isSelected ? AppColors.primaryAction : AppColors.secondaryActionBorder,
                              width: 2,
                            ),
                          ),
                          child: isSelected ? const Icon(Icons.check, size: 13, color: Colors.white) : null,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 18),

          // 4. Additional Notes
          Text(
            lang.tr('addNotes'),
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppColors.inputLabel),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _notesController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: lang.tr('notesHint'),
            ),
          ),
          const SizedBox(height: 24),

          // 5. Submit Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSubmitting
                  ? null
                  : () async {
                      setState(() => _isSubmitting = true);

                      await reportsProvider.submitReport(
                        issueType: lang.tr(_issueKeys[_selectedIssueTypeIndex]),
                        locationAddress: routing.currentAddress,
                        latitude: routing.currentLocation.latitude,
                        longitude: routing.currentLocation.longitude,
                        notes: _notesController.text.trim().isEmpty
                            ? 'Reported via TARA App'
                            : _notesController.text.trim(),
                        imagePath: _selectedImage?.path,
                      );

                      if (!mounted) return;
                      final scaffoldMessenger = ScaffoldMessenger.of(context);
                      final successMsg = lang.tr('reportSubmitted');
                      setState(() {
                        _isSubmitting = false;
                        _selectedImage = null;
                        _notesController.clear();
                      });

                      scaffoldMessenger.showSnackBar(
                        SnackBar(
                          content: Text(successMsg),
                          backgroundColor: AppColors.navActive,
                        ),
                      );

                      if (widget.onReportSubmitted != null) {
                        widget.onReportSubmitted!();
                      }
                    },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      lang.tr('submitReport'),
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                    ),
            ),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }
}
