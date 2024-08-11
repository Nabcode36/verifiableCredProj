import 'package:flutter/material.dart';
import 'package:animations/animations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'verification_screen.dart';
import 'settings_page.dart';
import 'credentials_page.dart';
import 'manage_trusted_issuers_screen.dart';
import 'credential_display_screen.dart';
import 'pin_screen.dart';

/// MyHomePage is the main screen of the application.
/// It displays various management options and a history of verifications.
class MyHomePage extends StatefulWidget {
  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  // API endpoints
  String _verifyEndpoint = 'http://10.0.2.2:3333/verify';
  String _validateEndpoint = 'http://10.0.2.2:3333/result';
  String _credentialsEndpoint = 'http://10.0.2.2:3333/presentation_definition';
  String _metadataEndpoint = 'http://10.0.2.2:3333/metadata';

  // Authentication token
  String _secretToken = '';

  // Service provider name
  String _name = 'Service Provider';

  // List to store verification history
  List<String> _history = [];

  /// Returns a list of colors for cards in light mode
  List<Color> getLightModeColors() => [
    Color(0xFFFFE5E5), // Light Pink
    Color(0xFFE5FFEC), // Light Mint
    Color(0xFFE5F0FF), // Light Blue
    Color(0xFFFFF5E5), // Light Peach
  ];

  /// Returns a list of colors for cards in dark mode
  List<Color> getDarkModeColors() => [
    Color(0xFF51395A), // Dark Pink
    Color(0xFF3D5934), // Dark Mint
    Color(0xFF344C64), // Dark Blue
    Color(0xFF4A3C2C), // Dark Peach
  ];

  /// Navigates to the PIN screen to lock the app
  void _lockApp() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => PinScreen()),
    );
  }

  /// Navigates to the Settings page
  void _navigateToSettings() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => SettingsPage(
          verifyEndpoint: _verifyEndpoint,
          validateEndpoint: _validateEndpoint,
          secretToken: _secretToken,
          credentialsEndpoint: _credentialsEndpoint,
          metadataEndpoint: _metadataEndpoint,
          name: _name,
          onSettingsUpdated: _updateSettings,
        ),
      ),
    );
  }

  /// Updates the app settings with new values
  void _updateSettings(
      String verifyEndpoint,
      String validateEndpoint,
      String secretToken,
      String credentialsEndpoint,
      String metadataEndpoint,
      String name,
      ) {
    setState(() {
      _verifyEndpoint = verifyEndpoint;
      _validateEndpoint = validateEndpoint;
      _secretToken = secretToken;
      _credentialsEndpoint = credentialsEndpoint;
      _metadataEndpoint = metadataEndpoint;
      _name = name.isNotEmpty ? name : 'Service Provider';
    });
  }

  @override
  void initState() {
    super.initState();
    _loadHistory();
    _loadName();
  }

  /// Loads the service provider name from SharedPreferences
  Future<void> _loadName() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _name = prefs.getString('name') ?? 'Service Provider';
    });
  }

  /// Loads the verification history from SharedPreferences
  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _history = prefs.getStringList('credential_history') ?? [];
    });
  }

  /// Deletes a specific history item
  Future<void> _deleteHistoryItem(int index) async {
    setState(() {
      _history.removeAt(index);
    });
    await _saveHistory();
  }

  /// Deletes all history items
  Future<void> _deleteAllHistory() async {
    setState(() {
      _history.clear();
    });
    await _saveHistory();
  }

  /// Saves the current history to SharedPreferences
  Future<void> _saveHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('credential_history', _history);
  }

  /// Navigates to the CredentialDisplayScreen for a specific history entry
  void _navigateToCredentialDisplay(String historyEntry) {
    try {
      final parts = historyEntry.split('|||');
      if (parts.length == 2) {
        final credentialData = jsonDecode(parts[1]) as List<dynamic>;
        final credentials = credentialData.map((item) =>
        Map<String, dynamic>.from(item as Map<String, dynamic>)
        ).toList();

        print('Navigating to CredentialDisplayScreen with ${credentials.length} credentials');
        print('Credential data: $credentials'); // Debug print

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => CredentialDisplayScreen(
              credentials: credentials,
              isFromHistory: true,
            ),
          ),
        );
      } else {
        print('Invalid history entry format: $historyEntry');
        _showErrorSnackBar('Invalid history entry format');
      }
    } catch (e) {
      print('Error navigating to CredentialDisplayScreen: $e');
      _showErrorSnackBar('Error loading credentials');
    }
  }

  /// Shows an error message in a SnackBar
  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  /// Navigates to the VerificationScreen and handles the result
  void _navigateToVerification() async {
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (context) => VerificationScreen(
          verifyEndpoint: _verifyEndpoint,
          validateEndpoint: _validateEndpoint,
          secretToken: _secretToken,
          title: 'Start Verification',
        ),
      ),
    );

    if (result != null && result['credentials'] != null) {
      List<Map<String, dynamic>> credentials = List<Map<String, dynamic>>.from(result['credentials']);
      await _addToHistory(credentials);

      // Instead of immediately pushing CredentialDisplayScreen, we return to MyHomePage
      setState(() {
        // Trigger a rebuild of the widget tree
      });
    }
  }

  /// Adds a new verification to the history
  Future<void> _addToHistory(List<Map<String, dynamic>> credentials) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> history = prefs.getStringList('credential_history') ?? [];

    // Extract the transaction ID from the first credential
    String transactionId = credentials.isNotEmpty ? credentials[0]['transaction_id'] ?? 'Unknown' : 'Unknown';

    String timestampedEntry = "${DateTime.now().toIso8601String()} - ID: $transactionId";
    String credentialData = jsonEncode(credentials);
    String historyEntry = "$timestampedEntry|||$credentialData";

    history.insert(0, historyEntry);
    if (history.length > 10) {
      history = history.sublist(0, 10);
    }

    await prefs.setStringList('credential_history', history);
    await _loadHistory(); // Reload the history after adding a new entry
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final cardColors = isDarkMode ? getDarkModeColors() : getLightModeColors();

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildTitleSection(),
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: _buildManagementCard('Issuers', 'Manage trusted issuers', Icons.security, ManageTrustedIssuersScreen(title: 'Manage Issuers'), cardColors[0])),
                        SizedBox(width: 16),
                        Expanded(child: _buildManagementCard('Credentials', 'Manage credential types', Icons.badge, CredentialsPage(credentialsEndpoint: _credentialsEndpoint, title: 'Manage Credentials'), cardColors[1])),
                      ],
                    ),
                    SizedBox(height: 32),
                    _buildActionCard(
                      'Start Verification',
                      Icons.qr_code_scanner,
                      'Generate a QR code to begin the verification process',
                      _navigateToVerification,
                      cardColors[2],
                    ),
                    SizedBox(height: 32),
                    _buildHistorySection(cardColors[3]),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Builds the title section of the home page
  Widget _buildTitleSection() {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: Offset(0, 2),
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
                'Welcome to',
                style: TextStyle(
                  fontSize: 18,
                  color: Colors.white.withOpacity(0.8),
                ),
              ),
              Row(
                children: [
                  IconButton(
                    icon: Icon(Icons.lock, color: Colors.white),
                    onPressed: _lockApp,
                  ),
                  IconButton(
                    icon: Icon(Icons.settings, color: Colors.white),
                    onPressed: _navigateToSettings,
                  ),
                ],
              ),
            ],
          ),
          Text(
            _name,
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  /// Builds a management card widget
  Widget _buildManagementCard(String title, String subtitle, IconData icon, Widget page, Color cardColor) {
    return OpenContainer(
      transitionType: ContainerTransitionType.fade,
      openBuilder: (BuildContext context, VoidCallback _) => page,
      closedShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      closedElevation: 2,
      closedColor: cardColor,
      closedBuilder: (BuildContext context, VoidCallback openContainer) => Card.filled(
        color: cardColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: InkWell(
          onTap: openContainer,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 48, color: Theme.of(context).primaryColor),
                SizedBox(height: 8),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium,
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 4),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Builds an action card widget
  Widget _buildActionCard(String title, IconData icon, String subtitle, VoidCallback onTap, Color cardColor) {
    return Card.filled(
      color: cardColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Icon(icon, size: 48, color: Theme.of(context).primaryColor),
              SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Builds the history section of the home page
  Widget _buildHistorySection(Color cardColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'History',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              if (_history.isNotEmpty)
                TextButton.icon(
                  icon: Icon(Icons.delete_sweep),
                  label: Text('Delete All'),
                  onPressed: _deleteAllHistory,
                ),
            ],
          ),
        ),
        if (_history.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              children: [
                Icon(Icons.swipe, size: 18, color: Theme.of(context).hintColor),
                SizedBox(width: 8),
                Text(
                  'Swipe left to delete items',
                  style: TextStyle(
                    color: Theme.of(context).hintColor,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: _history.isEmpty
                ? Center(child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text('No recent history'),
            ))
                : ListView.builder(
              shrinkWrap: true,
              physics: NeverScrollableScrollPhysics(),
              itemCount: _history.length,
              itemBuilder: (context, index) {
                final parts = _history[index].split('|||')[0].split(' - ');
                final dateTime = DateTime.parse(parts[0]);
                final transactionId = parts.length > 1 ? parts[1] : 'N/A';
                final summary = parts.length > 2 ? parts[2] : 'Unknown';

                return Dismissible(
                  key: Key(_history[index]),
                  background: Container(
                    color: Colors.red,
                    alignment: Alignment.centerRight,
                    padding: EdgeInsets.only(right: 16.0),
                    child: Icon(Icons.delete, color: Colors.white),
                  ),
                  direction: DismissDirection.endToStart,
                  onDismissed: (direction) {
                    _deleteHistoryItem(index);
                  },
                  child: ListTile(
                    leading: Icon(Icons.history),
                    title: Text(
                      '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text('$transactionId'),
                    onTap: () => _navigateToCredentialDisplay(_history[index]),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}