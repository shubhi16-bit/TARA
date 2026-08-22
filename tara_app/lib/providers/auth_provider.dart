import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthProvider extends ChangeNotifier {
  bool _isAuthenticated = false;
  String _phoneNumber = '';
  bool _isOtpSent = false;
  bool _isLoading = false;

  bool get isAuthenticated => _isAuthenticated;
  String get phoneNumber => _phoneNumber;
  bool get isOtpSent => _isOtpSent;
  bool get isLoading => _isLoading;

  AuthProvider() {
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    final prefs = await SharedPreferences.getInstance();
    _isAuthenticated = prefs.getBool('is_authenticated') ?? false;
    _phoneNumber = prefs.getString('user_phone') ?? '';
    notifyListeners();
  }

  Future<bool> sendOtp(String phone) async {
    _isLoading = true;
    notifyListeners();
    await Future.delayed(const Duration(milliseconds: 900)); // Network simulation
    _phoneNumber = phone;
    _isOtpSent = true;
    _isLoading = false;
    notifyListeners();
    return true;
  }

  Future<bool> verifyOtp(String otp) async {
    _isLoading = true;
    notifyListeners();
    await Future.delayed(const Duration(milliseconds: 1000)); // Verification simulation
    if (otp.length == 4 || otp == "1234") {
      _isAuthenticated = true;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('is_authenticated', true);
      await prefs.setString('user_phone', _phoneNumber);
      _isLoading = false;
      notifyListeners();
      return true;
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    _isAuthenticated = false;
    _isOtpSent = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('is_authenticated');
    notifyListeners();
  }
}
