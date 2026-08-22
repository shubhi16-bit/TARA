import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app_strings.dart';

class LanguageProvider extends ChangeNotifier {
  AppLanguage _currentLanguage = AppLanguage.en;
  bool _isLanguageChosen = false;

  AppLanguage get currentLanguage => _currentLanguage;
  bool get isLanguageChosen => _isLanguageChosen;

  LanguageProvider() {
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    final langCode = prefs.getString('user_language');
    final chosen = prefs.getBool('is_language_chosen') ?? false;

    if (langCode == 'hi') {
      _currentLanguage = AppLanguage.hi;
    } else {
      _currentLanguage = AppLanguage.en;
    }
    _isLanguageChosen = chosen;
    notifyListeners();
  }

  Future<void> setLanguage(AppLanguage language) async {
    _currentLanguage = language;
    _isLanguageChosen = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_language', language == AppLanguage.hi ? 'hi' : 'en');
    await prefs.setBool('is_language_chosen', true);
    notifyListeners();
  }

  String tr(String key) {
    return AppStrings.get(_currentLanguage, key);
  }
}
