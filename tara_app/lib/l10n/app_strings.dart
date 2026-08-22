enum AppLanguage { en, hi }

class AppStrings {
  static final Map<AppLanguage, Map<String, String>> _localizedValues = {
    AppLanguage.en: {
      // General & Brand
      'appName': 'TARA',
      'appTagline': 'Night Safety & Smart Route Mapping',
      'selectLanguage': 'Choose Your Language',
      'selectLanguageSub': 'Select your preferred language to continue',
      'continueBtn': 'Continue',
      'english': 'English',
      'hindi': 'हिंदी (Hindi)',

      // Authentication
      'phoneAuthTitle': 'Mobile Verification',
      'phoneAuthSub': 'Enter your mobile number to get an OTP for quick access',
      'phoneLabel': 'Phone Number',
      'phoneHint': '+91 98765 43210',
      'sendOtp': 'Get OTP',
      'enterOtp': 'Enter Verification Code',
      'otpSub': 'Enter the 4-digit code sent to your mobile',
      'verifyBtn': 'Verify & Proceed',
      'resendOtp': 'Resend OTP',

      // Home Screen
      'greeting': 'Stay Safe Tonight',
      'currentLocation': 'Current Location',
      'tapToRefreshGps': 'Tap to refresh GPS location',
      'safetyIndex': 'Area Night Safety Score',
      'riskScoreTitle': 'Calculated from lighting & commuter footfall',
      'quickActions': 'Quick Actions',
      'findSaferRoute': 'Find Safer Route',
      'findSaferRouteSub': 'Compare routes by lighting & pedestrian activity',
      'reportIssue': 'Report Dark Zone',
      'reportIssueSub': 'Report broken streetlights or unlit roads with photos',
      'nearbyAlert': '⚠️ 2 dark streetlights reported 400m ahead on College Road',

      // Route Comparison
      'routeFinderTitle': 'Smart Route Navigator',
      'startLocation': 'Your Current Location',
      'destination': 'Enter Destination',
      'findRouteBtn': 'Find Best Routes',
      'fastestRoute': 'FASTEST ROUTE',
      'saferRoute': 'TARA SAFER ROUTE',
      'recommended': 'RECOMMENDED',
      'highRisk': 'HIGH RISK',
      'lowRisk': 'LOW RISK',
      'startSaferRouteBtn': 'Start Safer Route',
      'lightingCondition': 'Lighting',
      'pedestrianExposure': 'Pedestrian Footfall',
      'reportedIssues': 'Reported Issues',

      // Report Issue
      'reportTitle': 'Report a Dark Zone',
      'reportSubtitle': 'Helps prioritize streetlight repairs for commuters',
      'issueType': 'Issue Type',
      'brokenLight': 'Broken Streetlight',
      'darkArea': 'Dark Stretch / No Lights',
      'multipleLights': 'Multiple Lights Non-Functional',
      'pedestrianActivity': 'Pedestrian Footfall on this Road',
      'footfallLow': 'Low (Deserted)',
      'footfallMed': 'Medium (Occasional Commuters)',
      'footfallHigh': 'High (Active Night Walkers)',
      'addNotes': 'Additional Notes / Landmarks',
      'notesHint': 'e.g. Near bus stop, flickering light, dark alleyway',
      'attachLocation': 'GPS Location Attached',
      'takePhoto': 'Take Photo of Streetlight / Dark Area',
      'camera': 'Camera',
      'gallery': 'Gallery',
      'retakePhoto': 'Change Photo',
      'removePhoto': 'Remove Photo',
      'submitReport': 'Submit Report',
      'reportSubmitted': 'Report submitted successfully with photo! Priority queued.',

      // My Reports
      'myReportsTitle': 'My Reports & Tracking',
      'myReportsSubtitle': 'Real-time repair queue tracking by municipality',
      'statusPending': 'Logged',
      'statusPrioritized': 'High Priority',
      'statusInRepair': 'Repair Scheduled',
      'statusResolved': 'Resolved',

      // Bottom Nav
      'navHome': 'Home',
      'navRoutes': 'Safe Routes',
      'navReport': 'Report',
      'navHistory': 'My Reports',
    },
    AppLanguage.hi: {
      // General & Brand
      'appName': 'तारा (TARA)',
      'appTagline': 'रात्रि सुरक्षा एवं सुरक्षित मार्ग नेविगेशन',
      'selectLanguage': 'अपनी भाषा चुनें',
      'selectLanguageSub': 'आगे बढ़ने के लिए अपनी पसंदीदा भाषा का चयन करें',
      'continueBtn': 'आगे बढ़ें',
      'english': 'English',
      'hindi': 'हिंदी (Hindi)',

      // Authentication
      'phoneAuthTitle': 'मोबाइल सत्यापन',
      'phoneAuthSub': 'त्वरित पहुंच हेतु अपना मोबाइल नंबर दर्ज करें',
      'phoneLabel': 'फ़ोन नंबर',
      'phoneHint': '+91 98765 43210',
      'sendOtp': 'ओटीपी (OTP) प्राप्त करें',
      'enterOtp': 'सत्यापन कोड दर्ज करें',
      'otpSub': 'आपके मोबाइल पर भेजा गया 4-अंकीय कोड दर्ज करें',
      'verifyBtn': 'सत्यापित करें और आगे बढ़ें',
      'resendOtp': 'ओटीपी पुनः भेजें',

      // Home Screen
      'greeting': 'रात में सुरक्षित रहें',
      'currentLocation': 'वर्तमान स्थान',
      'tapToRefreshGps': 'जीपीएस रीफ़्रेश करने के लिए टैप करें',
      'safetyIndex': 'क्षेत्रीय रात्रि सुरक्षा स्कोर',
      'riskScoreTitle': 'रोशनी और पैदल यात्रियों के आधार पर आकलित',
      'quickActions': 'त्वरित विकल्प',
      'findSaferRoute': 'सुरक्षित मार्ग खोजें',
      'findSaferRouteSub': 'रोशनी और पैदल आवागमन के आधार पर मार्ग तुलना',
      'reportIssue': 'डार्क-ज़ोन की शिकायत करें',
      'reportIssueSub': 'खराब स्ट्रीटलाइट या अंधेरे रास्तों की फोटो सहित रिपोर्ट करें',
      'nearbyAlert': '⚠️ कॉलेज रोड पर 400 मीटर आगे 2 स्ट्रीटलाइट्स खराब हैं',

      // Route Comparison
      'routeFinderTitle': 'स्मार्ट सेफ रूट फाइंडर',
      'startLocation': 'आपका वर्तमान स्थान',
      'destination': 'गंतव्य दर्ज करें',
      'findRouteBtn': 'सर्वश्रेष्ठ मार्ग खोजें',
      'fastestRoute': 'सबसे तेज़ मार्ग',
      'saferRoute': 'तारा अनुशंसित सुरक्षित मार्ग',
      'recommended': 'अनुशंसित (सुरक्षित)',
      'highRisk': 'उच्च जोखिम',
      'lowRisk': 'सुरक्षित / कम जोखिम',
      'startSaferRouteBtn': 'सुरक्षित मार्ग शुरू करें',
      'lightingCondition': 'स्ट्रीटलाइट स्थिति',
      'pedestrianExposure': 'पैदल आवागमन (Footfall)',
      'reportedIssues': 'दर्ज शिकायतें',

      // Report Issue
      'reportTitle': 'डार्क-ज़ोन की रिपोर्ट करें',
      'reportSubtitle': 'नगर निगम द्वारा प्राथमिकता मरम्मत में सहायता करता है',
      'issueType': 'समस्या का प्रकार',
      'brokenLight': 'टूटी / खराब स्ट्रीटलाइट',
      'darkArea': 'अंधेरा क्षेत्र / कोई लाइट नहीं',
      'multipleLights': 'कई लाइटें काम नहीं कर रही हैं',
      'pedestrianActivity': 'इस मार्ग पर पैदल यात्रियों का आवागमन',
      'footfallLow': 'कम (सन्नाटा/सुनसान)',
      'footfallMed': 'मध्यम (सामान्य आवागमन)',
      'footfallHigh': 'अधिक (व्यस्त पैदल मार्ग)',
      'addNotes': 'अतिरिक्त विवरण / लैंडमार्क',
      'notesHint': 'उदा. बस स्टॉप के पास, टिमटिमाती लाइट, संकरी गली',
      'attachLocation': 'जीपीएस स्थान संलग्न है',
      'takePhoto': 'स्ट्रीटलाइट / अंधेरे क्षेत्र की फोटो लें',
      'camera': 'कैमरा',
      'gallery': 'गैलरी',
      'retakePhoto': 'फोटो बदलें',
      'removePhoto': 'फोटो हटाएं',
      'submitReport': 'रिपोर्ट दर्ज करें',
      'reportSubmitted': 'फोटो सहित रिपोर्ट सफलतापूर्वक दर्ज की गई! प्राथमिकता कतार में जोड़ा गया।',

      // My Reports
      'myReportsTitle': 'मेरी रिपोर्ट्स व स्थिति',
      'myReportsSubtitle': 'नगर निगम द्वारा रीयल-टाइम मरम्मत की प्रगति',
      'statusPending': 'दर्ज हुई',
      'statusPrioritized': 'उच्च प्राथमिकता',
      'statusInRepair': 'मरम्मत निर्धारित',
      'statusResolved': 'समाधान संपन्न',

      // Bottom Nav
      'navHome': 'होम',
      'navRoutes': 'सुरक्षित रूट्स',
      'navReport': 'शिकायत',
      'navHistory': 'मेरी रिपोर्ट्स',
    },
  };

  static String get(AppLanguage lang, String key) {
    return _localizedValues[lang]?[key] ?? key;
  }
}
