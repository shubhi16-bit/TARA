class AppConfig {
  /// Production Backend API URL.
  /// Can be overridden during build time using:
  /// flutter build apk --dart-define=API_URL=https://your-custom-domain.com/api
  static const String _envApiUrl = String.fromEnvironment('API_URL');

  /// Default production Render backend URL
  static const String defaultProductionApiUrl = 'https://tara-backend.onrender.com/api';

  /// Fallback local development URL
  static const String defaultLocalApiUrl = 'http://localhost:5000/api';

  /// Active Base API URL
  static String get apiBaseUrl {
    if (_envApiUrl.isNotEmpty) {
      return _envApiUrl;
    }
    return defaultProductionApiUrl;
  }
}

