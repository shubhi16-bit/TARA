import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'theme/app_theme.dart';
import 'l10n/language_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/reports_provider.dart';
import 'providers/routing_provider.dart';
import 'screens/language_select_screen.dart';
import 'screens/phone_auth_screen.dart';
import 'screens/main_navigation_wrapper.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LanguageProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ReportsProvider()),
        ChangeNotifierProvider(create: (_) => RoutingProvider()),
      ],
      child: const TaraApp(),
    ),
  );
}

class TaraApp extends StatelessWidget {
  const TaraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TARA - Night Safety',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const RootDecider(),
    );
  }
}

class RootDecider extends StatelessWidget {
  const RootDecider({super.key});

  @override
  Widget build(BuildContext context) {
    final langProvider = Provider.of<LanguageProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);

    // 1. First time opening -> Choose Language (English / Hindi)
    if (!langProvider.isLanguageChosen) {
      return const LanguageSelectScreen();
    }

    // 2. Not logged in -> Mobile Verification Screen
    if (!authProvider.isAuthenticated) {
      return const PhoneAuthScreen();
    }

    // 3. Authenticated -> Main Citizen Experience
    return const MainNavigationWrapper();
  }
}
