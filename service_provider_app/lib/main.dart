// Import necessary packages
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';

// Import local screens/pages
import 'home_page.dart';
import 'onboarding_screen.dart';
import 'pin_screen.dart';

// Global navigator key for accessing navigator from anywhere
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

// Main entry point of the application
void main() async {
  // Ensure Flutter is initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Get instance of SharedPreferences for local storage
  SharedPreferences prefs = await SharedPreferences.getInstance();

  // Check if user has completed onboarding, default to false if not set
  bool onboarded = prefs.getBool('onboarded') ?? false;

  // Retrieve stored PIN, if any
  String? pin = prefs.getString('pin');

  // Run the app with initial state
  runApp(MyApp(onboarded: onboarded, pin: pin));
}

// Root widget of the application
class MyApp extends StatelessWidget {
  final bool onboarded;
  final String? pin;

  const MyApp({Key? key, required this.onboarded, this.pin}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AutoLockWrapper(
      child: MaterialApp(
        navigatorKey: navigatorKey,
        title: 'Service Provider',
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: Colors.blue,
            brightness: Brightness.light,
          ),
        ),
        darkTheme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: Colors.blue,
            brightness: Brightness.dark,
          ),
        ),
        themeMode: ThemeMode.system,
        home: _getInitialScreen(),
      ),
    );
  }

  // Determine the initial screen based on app state
  Widget _getInitialScreen() {
    if (!onboarded) {
      return OnboardingScreen();
    } else if (pin == null) {
      return PinScreen(isSetup: true);
    } else {
      return MyHomePage();
    }
  }
}

// Wrapper widget to handle auto-locking functionality
class AutoLockWrapper extends StatefulWidget {
  final Widget child;

  const AutoLockWrapper({Key? key, required this.child}) : super(key: key);

  @override
  _AutoLockWrapperState createState() => _AutoLockWrapperState();
}

class _AutoLockWrapperState extends State<AutoLockWrapper> {
  Timer? _lockTimer;
  late Duration _lockDuration;

  @override
  void initState() {
    super.initState();
    _loadLockDuration();
  }

  // Load lock duration from SharedPreferences
  Future<void> _loadLockDuration() async {
    final prefs = await SharedPreferences.getInstance();
    final lockTime = prefs.getString('lock_inactivity_time') ?? '5';
    setState(() {
      _lockDuration = lockTime == 'never'
          ? Duration(days: 365) // Effectively never
          : Duration(minutes: int.parse(lockTime));
    });
    _resetLockTimer();
  }

  // Reset the lock timer
  void _resetLockTimer() {
    _lockTimer?.cancel();
    if (_lockDuration.inMinutes < 365 * 24 * 60) { // Check if it's not set to "never"
      _lockTimer = Timer(_lockDuration, _lockApp);
    }
  }

  // Lock the app by navigating to the PIN screen
  void _lockApp() {
    navigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => PinScreen()),
          (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => _loadLockDuration(),
      onPointerMove: (_) => _loadLockDuration(),
      onPointerUp: (_) => _loadLockDuration(),
      child: widget.child,
    );
  }

  @override
  void dispose() {
    _lockTimer?.cancel();
    super.dispose();
  }
}