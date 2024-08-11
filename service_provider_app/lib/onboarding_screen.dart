// Import necessary packages
import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';
import 'package:file_picker/file_picker.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'home_page.dart';
import 'add_credential_screen.dart';

/// OnboardingScreen is a StatefulWidget that guides the user through the initial setup process.
class OnboardingScreen extends StatefulWidget {
  @override
  _OnboardingScreenState createState() => _OnboardingScreenState();
}

/// _OnboardingScreenState manages the state and logic for the OnboardingScreen.
class _OnboardingScreenState extends State<OnboardingScreen> {
  // Controller for managing page views
  final PageController _pageController = PageController();

  // State variables
  int _currentPage = 0;
  final int _numPages = 5;
  final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');
  QRViewController? controller;
  bool _isLoading = false;
  bool _isConnected = false;
  bool _nameError = false;
  bool _isAwaitingApproval = false;
  http.Client? _client;

  // Settings variables
  String _backendUrl = '';
  String _name = '';
  String? _logoPath;
  String? _tosPath;
  String? _policyPath;

  // PIN and biometric variables
  String _pin = '';
  bool _useBiometrics = false;
  bool _canCheckBiometrics = false;
  final LocalAuthentication _localAuth = LocalAuthentication();

  @override
  void initState() {
    super.initState();
    _checkBiometricSupport();
  }

  @override
  void dispose() {
    controller?.dispose();
    _pageController.dispose();
    super.dispose();
  }

  /// Checks if the device supports biometric authentication.
  Future<void> _checkBiometricSupport() async {
    bool canCheckBiometrics = await _localAuth.canCheckBiometrics;
    setState(() {
      _useBiometrics = canCheckBiometrics;
    });
  }

  /// Callback function for when the QR view is created.
  void _onQRViewCreated(QRViewController controller) {
    this.controller = controller;
    controller.scannedDataStream.listen((scanData) {
      if (scanData.code != null && scanData.code!.startsWith('http')) {
        setState(() {
          _backendUrl = scanData.code!;
        });
        controller.pauseCamera();
        _connectToBackend();
      }
    });
  }

  /// Shows a dialog for manual entry of the backend URL.
  void _showManualEntryDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Enter Backend URL'),
          content: TextField(
            onChanged: (value) {
              _backendUrl = value;
            },
            decoration: InputDecoration(hintText: "http://127.0.0.1:3000/onboard"),
          ),
          actions: <Widget>[
            TextButton(
              child: Text('Cancel'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
            TextButton(
              child: Text('Confirm'),
              onPressed: () {
                Navigator.of(context).pop();
                _connectToBackend();
              },
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: _currentPage > 0
            ? IconButton(
          icon: Icon(Icons.arrow_back, color: Theme.of(context).colorScheme.primary),
          onPressed: () {
            _pageController.previousPage(
              duration: Duration(milliseconds: 300),
              curve: Curves.easeInOut,
            );
          },
        )
            : null,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: NeverScrollableScrollPhysics(), // Prevent swiping
                onPageChanged: (int page) {
                  setState(() {
                    _currentPage = page;
                  });
                },
                children: [
                  _buildWelcomePage(),
                  _buildConnectBackendPage(),
                  _buildSetupSettingsPage(),
                  _buildSetupSecurityPage(),
                  _buildFinishPage(),
                ],
              ),
            ),
            _buildBottomNavigation(),
          ],
        ),
      ),
    );
  }

  /// Builds the welcome page of the onboarding process.
  Widget _buildWelcomePage() {
    return _buildPageLayout(
      icon: Icons.verified_user,
      title: 'Welcome to the future of Credentials',
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Let\'s set up your business to manage and verify credentials with ease.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: Theme.of(context).colorScheme.onBackground.withOpacity(0.7),
            ),
          ),
          SizedBox(height: 32),
          _buildFeatureHeroCard(),
        ],
      ),
    );
  }

  /// Builds a card showcasing the key features of the app.
  Widget _buildFeatureHeroCard() {
    final features = [
      'Secure credential management',
      'Easy verification process',
      'Streamlined onboarding',
      'Customizable settings',
    ];

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Key Features',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            SizedBox(height: 16),
            ...features.map((feature) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: Theme.of(context).colorScheme.primary),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      feature,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ),
                ],
              ),
            )).toList(),
          ],
        ),
      ),
    );
  }

  /// Builds the page for connecting to the backend server.
  Widget _buildConnectBackendPage() {
    return _buildPageLayout(
      icon: Icons.qr_code_scanner,
      title: 'Connect to Backend',
      content: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Center(
              child: Container(
                width: 250,
                height: 250,
                child: QRView(
                  key: qrKey,
                  onQRViewCreated: _onQRViewCreated,
                  overlay: QrScannerOverlayShape(
                    borderColor: Theme.of(context).colorScheme.primary,
                    borderRadius: 10,
                    borderLength: 30,
                    borderWidth: 10,
                    cutOutSize: 250,
                  ),
                ),
              ),
            ),
          ),
          SizedBox(height: 20),
          Text(
            _isConnected
                ? 'Successfully connected to backend'
                : _isAwaitingApproval
                ? 'Awaiting server approval...'
                : 'Scan the QR code to connect to the backend',
            style: Theme.of(context).textTheme.bodyLarge,
            textAlign: TextAlign.center,
          ),
          if (_isLoading)
            Column(
              children: [
                SizedBox(height: 24),
                CircularProgressIndicator(),
                SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _cancelConnection,
                  child: Text('Cancel'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.error,
                    foregroundColor: Theme.of(context).colorScheme.onError,
                  ),
                ),
              ],
            )
          else if (!_isConnected)
            TextButton(
              onPressed: () => _showManualEntryDialog(context),
              child: Text('Enter URL manually'),
              style: TextButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.primary,
              ),
            ),
        ],
      ),
    );
  }

  /// Attempts to connect to the backend server.
  Future<void> _connectToBackend() async {
    setState(() {
      _isLoading = true;
      _isAwaitingApproval = true;
    });

    try {
      final senderId = await _getSenderId();
      _client = http.Client();
      final response = await _client!.post(
        Uri.parse(_backendUrl),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'sender_id': senderId}),
      );

      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        if (responseData['approved'] == true) {
          await _storeConnectionData(responseData);
          setState(() {
            _isConnected = true;
            _name = responseData['name'];
            _isAwaitingApproval = false;
          });
          if (responseData['setup'] == true) {
            _skipToFinishPage();
          }
        } else {
          _showErrorSnackBar('Connection not approved by the backend.');
          controller?.resumeCamera();
        }
      } else {
        _showErrorSnackBar('Failed to connect. Status code: ${response.statusCode}');
        controller?.resumeCamera();
      }
    } catch (e) {
      _showErrorSnackBar('Error: $e');
      controller?.resumeCamera();
    } finally {
      setState(() {
        _isLoading = false;
        if (!_isConnected) _isAwaitingApproval = false;
      });
      _client?.close();
    }
  }

  /// Cancels the ongoing connection attempt.
  void _cancelConnection() {
    _client?.close();
    setState(() {
      _isAwaitingApproval = false;
      _isLoading = false;
    });
    _showErrorSnackBar('Connection request cancelled.');
    controller?.resumeCamera();
  }

  /// Displays an error message using a SnackBar.
  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  /// Stores the connection data received from the backend.
  Future<void> _storeConnectionData(Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('device_id', data['device_id']);
    await prefs.setString('secret_token', data['password']);
    await prefs.setString('root_url', data['url']);
    await prefs.setString('name', data['name']);
    await prefs.setBool('setup', data['setup']);

    // Store individual endpoint URLs
    final rootUrl = data['url'];
    await prefs.setString('verify_endpoint', '$rootUrl/verify');
    await prefs.setString('validate_endpoint', '$rootUrl/result');
    await prefs.setString('credentials_endpoint', '$rootUrl/presentation_definition');
    await prefs.setString('metadata_endpoint', '$rootUrl/metadata');

    String test = await prefs.getString('credentials_endpoint') ?? '';
    print("STORED DATA: $test");
  }

  /// Skips to the finish page of the onboarding process.
  void _skipToFinishPage() {
    _pageController.animateToPage(
      3, // Index of the finish page
      duration: Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  /// Generates a unique sender ID for the device.
  Future<String> _getSenderId() async {
    DeviceInfoPlugin deviceInfo = DeviceInfoPlugin();
    if (Theme.of(context).platform == TargetPlatform.android) {
      AndroidDeviceInfo androidInfo = await deviceInfo.androidInfo;
      return 'android_${androidInfo.id}';
    } else if (Theme.of(context).platform == TargetPlatform.iOS) {
      IosDeviceInfo iosInfo = await deviceInfo.iosInfo;
      return 'ios_${iosInfo.identifierForVendor}';
    }
    return 'unknown_${DateTime.now().millisecondsSinceEpoch}';
  }

  /// Builds the page for setting up initial settings.
  Widget _buildSetupSettingsPage() {
    return _buildPageLayout(
      icon: Icons.settings,
      title: 'Setup Initial Settings',
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      decoration: InputDecoration(
                        labelText: 'Name',
                        border: OutlineInputBorder(),
                        errorText: _nameError ? 'Name is required' : null,
                        errorStyle: TextStyle(color: Colors.red),
                      ),
                      onChanged: (value) {
                        setState(() {
                          _name = value;
                          _nameError = false;
                        });
                      },
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Optional Uploads:',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    SizedBox(height: 8),
                    IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: _buildFileUploadCard('Logo', 'logo', _logoPath),
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: _buildFileUploadCard('ToS', 'tos', _tosPath),
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: _buildFileUploadCard('Policy', 'policy', _policyPath),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Builds a card for file upload functionality.
  Widget _buildFileUploadCard(String label, String type, String? filePath) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final cardColors = isDarkMode ? _getDarkModeColors() : _getLightModeColors();
    final color = cardColors[['logo', 'tos', 'policy'].indexOf(type)];

    IconData iconData;
    switch (type) {
      case 'logo':
        iconData = Icons.image;
        break;
      case 'tos':
        iconData = Icons.description;
        break;
      case 'policy':
        iconData = Icons.policy;
        break;
      default:
        iconData = Icons.upload_file;
    }

    return Card(
      color: color,
      child: InkWell(
        onTap: () {
          switch (type) {
            case 'logo':
              _pickLogo();
              break;
            case 'tos':
              _pickToS();
              break;
            case 'policy':
              _pickPolicy();
              break;
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(iconData, size: 48),
              SizedBox(height: 8),
              Flexible(
                child: Text(
                  filePath != null ? filePath.split('/').last : label,
                  style: TextStyle(fontSize: 14),
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Returns a list of colors for light mode UI elements.
  List<Color> _getLightModeColors() => [
    Color(0xFFFFE5E5), // Light Pink
    Color(0xFFE5FFEC), // Light Mint
    Color(0xFFE5F0FF), // Light Blue
    Color(0xFFFFF5E5), // Light Peach
  ];

  /// Returns a list of colors for dark mode UI elements.
  List<Color> _getDarkModeColors() => [
    Color(0xFF51395A), // Dark Pink
    Color(0xFF3D5934), // Dark Mint
    Color(0xFF344C64), // Dark Blue
    Color(0xFF4A3C2C), // Dark Peach
  ];

  /// Builds the final page of the onboarding process.
  Widget _buildFinishPage() {
    return _buildPageLayout(
      icon: Icons.check_circle,
      title: 'Setup Complete!',
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome, $_name!',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            SizedBox(height: 20),
            Text(
              'You\'re all set to start using the Service Provider app.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Theme.of(context).colorScheme.onBackground.withOpacity(0.7),
              ),
            ),
            SizedBox(height: 32),
            _buildNextStepsHeroCard(),
          ],
        ),
      ),
    );
  }

  /// Builds a card displaying the next steps for the user.
  Widget _buildNextStepsHeroCard() {
    final nextSteps = [
      'Add your first credential',
      'Customize your profile settings',
      'Invite team members',
      'Start verifying credentials',
    ];

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Next Steps',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            SizedBox(height: 16),
            ...nextSteps.map((step) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Row(
                children: [
                  Icon(Icons.arrow_forward, color: Theme.of(context).colorScheme.primary),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      step,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ),
                ],
              ),
            )).toList(),
          ],
        ),
      ),
    );
  }

  /// Builds the page for setting up security measures (PIN entry).
  Widget _buildSetupSecurityPage() {
    return _buildPageLayout(
      icon: Icons.security,
      title: 'Enter a 4-digit PIN',
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            SizedBox(height: 16),
            _buildPinEntryCard(),
          ],
        ),
      ),
    );
  }

  /// Builds a card for PIN entry functionality.
  Widget _buildPinEntryCard() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildPinDisplay(),
            SizedBox(height: 24),
            _buildNumberPad(),
          ],
        ),
      ),
    );
  }

  /// Builds the PIN display area showing entered digits as dots.
  Widget _buildPinDisplay() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        ...List.generate(4, (index) {
          return Container(
            margin: EdgeInsets.symmetric(horizontal: 8),
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: index < _pin.length
                  ? Theme.of(context).colorScheme.primary
                  : Colors.grey[300],
            ),
          );
        }),
        SizedBox(width: 16),
        _buildDeleteButton(),
      ],
    );
  }

  /// Builds the number pad for PIN entry.
  Widget _buildNumberPad() {
    return Container(
      width: 280,
      child: GridView.builder(
          shrinkWrap: true,
          physics: NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 1.5,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: 12,
      itemBuilder: (context, index) {
        if (index == 9) {
          return Container();
        } else if (index == 10) {
          return _buildNumberPadButton('0');
        } else if (index == 11) {
          return Container();
        } else {
          return _buildNumberPadButton('${index + 1}');
        }
      },
    ),
    );
  }

  /// Builds a button for the number pad.
  Widget _buildNumberPadButton(String number) {
    return Material(
      color: Colors.transparent,
      child: Ink(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            if (_pin.length < 4) {
              setState(() {
                _pin += number;
              });
            }
          },
          child: Center(
            child: Text(
              number,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Builds a delete button for the PIN entry.
  Widget _buildDeleteButton() {
    return IconButton(
      icon: Icon(Icons.backspace, color: Theme.of(context).colorScheme.primary),
      onPressed: () {
        if (_pin.isNotEmpty) {
          setState(() {
            _pin = _pin.substring(0, _pin.length - 1);
          });
        }
      },
    );
  }

  /// Builds the layout for each page in the onboarding process.
  Widget _buildPageLayout({
    required IconData icon,
    required String title,
    required Widget content,
  }) {
    return Padding(
      padding: EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 60, color: Theme.of(context).colorScheme.primary),
          SizedBox(height: 24),
          Text(
            title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          SizedBox(height: 16),
          Expanded(child: content),
        ],
      ),
    );
  }

  /// Builds the bottom navigation area with progress indicator and next button.
  Widget _buildBottomNavigation() {
    return Column(
      children: [
        Padding(
          padding: EdgeInsets.all(24.0),
          child: SizedBox(
            width: double.infinity,
            height: 56,
            child: _currentPage == 1 && !_isConnected
                ? SizedBox() // Hide the button on the connect page if not connected
                : ElevatedButton(
              onPressed: () {
                if (_currentPage == 2 && _name.trim().isEmpty) {
                  setState(() {
                    _nameError = true;
                  });
                } else if (_currentPage == 3 && _pin.length != 4) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Please enter a 4-digit PIN')),
                  );
                } else if (_currentPage < _numPages - 1) {
                  _pageController.nextPage(
                    duration: Duration(milliseconds: 300),
                    curve: Curves.easeInOut,
                  );
                } else {
                  _finishOnboarding();
                }
              },
              child: Text(
                _currentPage == _numPages - 1 ? 'Get Started' : 'Next',
                style: TextStyle(fontSize: 18),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Theme.of(context).colorScheme.onPrimary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ),
        LinearProgressIndicator(
          value: (_currentPage + 1) / _numPages,
          backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.2),
          valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).colorScheme.primary),
        ),
      ],
    );
  }

  /// Handles the logo file picking process.
  void _pickLogo() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(type: FileType.image);
    if (result != null) {
      setState(() {
        _logoPath = result.files.single.path;
      });
    }
  }

  /// Handles the Terms of Service file picking process.
  void _pickToS() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(type: FileType.any);
    if (result != null) {
      setState(() {
        _tosPath = result.files.single.path;
      });
    }
  }

  /// Handles the Policy file picking process.
  void _pickPolicy() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(type: FileType.any);
    if (result != null) {
      setState(() {
        _policyPath = result.files.single.path;
      });
    }
  }

  /// Completes the onboarding process and navigates to the home page.
  void _finishOnboarding() async {
    // Save settings
    SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarded', true);
    await prefs.setString('backendUrl', _backendUrl);
    await prefs.setString('name', _name);
    await prefs.setString('pin', _pin);
    // Note: Biometrics preference is no longer saved
    if (_logoPath != null) await prefs.setString('logoPath', _logoPath!);
    if (_tosPath != null) await prefs.setString('tosPath', _tosPath!);
    if (_policyPath != null) await prefs.setString('policyPath', _policyPath!);

    // Navigate directly to the HomePage
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => MyHomePage()),
    );
  }
}