// Import necessary packages and files
import 'package:flutter/material.dart';
import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'onboarding_screen.dart';
import 'pin_screen.dart';

/// SettingsPage widget for managing app settings
class SettingsPage extends StatefulWidget {
  // Required parameters for the SettingsPage
  final String verifyEndpoint;
  final String validateEndpoint;
  final String secretToken;
  final String credentialsEndpoint;
  final String metadataEndpoint;
  final String name;
  final Function(String, String, String, String, String, String) onSettingsUpdated;

  SettingsPage({
    required this.verifyEndpoint,
    required this.validateEndpoint,
    required this.secretToken,
    required this.credentialsEndpoint,
    required this.metadataEndpoint,
    required this.name,
    required this.onSettingsUpdated,
  });

  @override
  _SettingsPageState createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  // Text controllers for various input fields
  late TextEditingController _rootUrlController;
  late TextEditingController _verifyEndpointController;
  late TextEditingController _validateEndpointController;
  late TextEditingController _credentialsEndpointController;
  late TextEditingController _metadataEndpointController;
  late TextEditingController _nameController;

  // Default lock inactivity time and secret token
  String _lockInactivityTime = '5'; // Default to 5 minutes
  late String _secretToken;

  bool _isLoading = true;

  // File objects for logo, terms of service, and policy
  File? _logoFile;
  File? _tosFile;
  File? _policyFile;

  bool _isEndpointsExpanded = false;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
    _loadLockInactivityTime();
  }

  /// Handles the PIN reset process
  Future<void> _resetPin() async {
    bool confirmReset = await showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Reset PIN'),
          content: Text('You need to enter your current PIN before setting a new one. Do you want to continue?'),
          actions: <Widget>[
            TextButton(
              child: Text('Cancel'),
              onPressed: () => Navigator.of(context).pop(false),
            ),
            TextButton(
              child: Text('Continue'),
              onPressed: () => Navigator.of(context).pop(true),
            ),
          ],
        );
      },
    );

    if (confirmReset == true) {
      // Navigate to PinScreen for verification and reset
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => PinScreen(
            isVerifying: true,
            onSuccess: () {
              // If verification is successful, navigate to PIN setup
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (context) => PinScreen(isSetup: true),
                ),
              );
            },
          ),
        ),
      );
    }
  }

  /// Loads the lock inactivity time from SharedPreferences
  Future<void> _loadLockInactivityTime() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _lockInactivityTime = prefs.getString('lock_inactivity_time') ?? '5';
      _secretToken = prefs.getString('secret_token') ?? '';
    });
  }

  /// Initializes text controllers with saved values
  Future<void> _initializeControllers() async {
    final prefs = await SharedPreferences.getInstance();

    setState(() {
      _rootUrlController = TextEditingController(text: prefs.getString('root_url') ?? '');
      _verifyEndpointController = TextEditingController(text: prefs.getString('verify_endpoint') ?? '');
      _validateEndpointController = TextEditingController(text: prefs.getString('validate_endpoint') ?? '');
      _credentialsEndpointController = TextEditingController(text: prefs.getString('credentials_endpoint') ?? '');
      _metadataEndpointController = TextEditingController(text: prefs.getString('metadata_endpoint') ?? '');
      _nameController = TextEditingController(text: prefs.getString('name') ?? widget.name);
      _isLoading = false;
    });
  }

  /// Extracts the root URL from a given URL string
  String extractRootUrl(String url) {
    Uri uri = Uri.parse(url);
    return '${uri.scheme}://${uri.host}:${uri.port}';
  }

  /// Updates endpoint controllers based on the root URL
  void updateEndpoints(String rootUrl) {
    setState(() {
      _verifyEndpointController.text = '$rootUrl/verify';
      _validateEndpointController.text = '$rootUrl/result';
      _credentialsEndpointController.text = '$rootUrl/presentation_definition';
      _metadataEndpointController.text = '$rootUrl/metadata';
    });
  }

  @override
  void dispose() {
    // Dispose of all controllers
    _rootUrlController.dispose();
    _verifyEndpointController.dispose();
    _validateEndpointController.dispose();
    _credentialsEndpointController.dispose();
    _metadataEndpointController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  /// Handles file picking for logo, terms of service, and policy
  Future<void> _pickFile(String type) async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: type == 'logo' ? ['jpg', 'png'] : ['txt'],
    );

    if (result != null) {
      setState(() {
        if (type == 'logo') {
          _logoFile = File(result.files.single.path!);
        } else if (type == 'tos') {
          _tosFile = File(result.files.single.path!);
        } else if (type == 'policy') {
          _policyFile = File(result.files.single.path!);
        }
      });
    }
  }

  /// Saves the current settings
  Future<void> _saveSettings() async {
    // Update settings via callback
    widget.onSettingsUpdated(
      _verifyEndpointController.text,
      _validateEndpointController.text,
      widget.secretToken, // Keep the existing secret token
      _credentialsEndpointController.text,
      _metadataEndpointController.text,
      _nameController.text,
    );

    // Prepare multipart request
    var request = http.MultipartRequest('POST', Uri.parse(_metadataEndpointController.text));

    request.headers['Authorization'] = 'Bearer ${_secretToken}';

    // Add text fields
    request.fields['name'] = _nameController.text;

    // Add file fields
    if (_logoFile != null) {
      request.files.add(await http.MultipartFile.fromPath(
        'logo',
        _logoFile!.path,
        contentType: MediaType('image', 'jpeg'),
      ));
    }
    if (_tosFile != null) {
      request.files.add(await http.MultipartFile.fromPath(
        'terms_of_service',
        _tosFile!.path,
        contentType: MediaType('text', 'plain'),
      ));
    }
    if (_policyFile != null) {
      request.files.add(await http.MultipartFile.fromPath(
        'policy',
        _policyFile!.path,
        contentType: MediaType('text', 'plain'),
      ));
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('lock_inactivity_time', _lockInactivityTime);

    // Send the request
    try {
      var response = await request.send();
      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Settings updated successfully'),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
        // Navigate back to the home page
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update settings. Status code: ${response.statusCode}'),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error updating settings: $e'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  /// Deletes all app data and navigates to the onboarding screen
  Future<void> _deleteAppData() async {
    bool confirmDelete = await showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Delete App Data'),
          content: Text('Are you sure you want to delete all app data? This action cannot be undone.'),
          actions: <Widget>[
            TextButton(
              child: Text('Cancel'),
              onPressed: () => Navigator.of(context).pop(false),
            ),
            TextButton(
              child: Text('Delete'),
              onPressed: () => Navigator.of(context).pop(true),
            ),
          ],
        );
      },
    );

    if (confirmDelete == true) {
      // Clear shared preferences
      SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      // Navigate to the OnboardingScreen
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => OnboardingScreen()),
            (Route<dynamic> route) => false,
      );
    }
  }

  /// Builds a text field with a given controller and label
  Widget _buildTextField(TextEditingController controller, String label) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(),
      ),
    );
  }

  /// Builds a card for file upload (logo, ToS, policy)
  Widget _buildFileUploadCard(String label, String type, File? file) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final cardColors = isDarkMode ? getDarkModeColors() : getLightModeColors();
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
        onTap: () => _pickFile(type),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(iconData, size: 48),
              SizedBox(height: 8),
              Text(
                file != null ? file.path.split('/').last : label,
                style: TextStyle(fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Returns a list of colors for light mode
  List<Color> getLightModeColors() => [
    Color(0xFFFFE5E5), // Light Pink
    Color(0xFFE5FFEC), // Light Mint
    Color(0xFFE5F0FF), // Light Blue
    Color(0xFFFFF5E5), // Light Peach
  ];

  /// Returns a list of colors for dark mode
  List<Color> getDarkModeColors() => [
    Color(0xFF51395A), // Dark Pink
    Color(0xFF3D5934), // Dark Mint
    Color(0xFF344C64), // Dark Blue
    Color(0xFF4A3C2C), // Dark Peach
  ];

  /// Builds a dropdown for selecting lock inactivity time
  Widget _buildLockInactivityDropdown() {
    return DropdownButtonFormField<String>(
      decoration: InputDecoration(
        labelText: 'Lock Inactivity Time',
        border: OutlineInputBorder(),
      ),
      value: _lockInactivityTime,
      items: [
        DropdownMenuItem(child: Text('1 minute'), value: '1'),
        DropdownMenuItem(child: Text('5 minutes'), value: '5'),
        DropdownMenuItem(child: Text('30 minutes'), value: '30'),
        DropdownMenuItem(child: Text('Never'), value: 'never'),
      ],
      onChanged: (value) {
        setState(() {
          _lockInactivityTime = value!;
        });
      },
    );
  }

  /// Builds an expandable section with a title and list of widgets
  Widget _buildExpandableSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () {
            setState(() {
              _isEndpointsExpanded = !_isEndpointsExpanded;
            });
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                Icon(
                  _isEndpointsExpanded ? Icons.expand_less : Icons.expand_more,
                ),
              ],
            ),
          ),
        ),
        if (_isEndpointsExpanded) ...[
          SizedBox(height: 16),
          ...children,
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text('Settings')),
        body: Center(child: CircularProgressIndicator()),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text('Settings'),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 16.0, top: 16.0, right: 16.0),
              child: Text(
                'Details',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildTextField(_nameController, 'Name'),
                      SizedBox(height: 16),
                      _buildLockInactivityDropdown(),
                      SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _resetPin,
                        child: Text('Reset PIN'),
                        style: ElevatedButton.styleFrom(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          backgroundColor: Theme.of(context).colorScheme.secondary,
                          foregroundColor: Theme.of(context).colorScheme.onSecondary,
                        ),
                      ),
                      SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _buildFileUploadCard('Upload Logo', 'logo', _logoFile),
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: _buildFileUploadCard('Upload ToS', 'tos', _tosFile),
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: _buildFileUploadCard('Upload Policy', 'policy', _policyFile),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.only(left: 16.0, right: 16.0),
              child: Text(
                'Endpoints',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      TextField(
                        controller: _rootUrlController,
                        decoration: InputDecoration(
                          labelText: 'Root URL (including port)',
                          hintText: 'http://127.0.0.1:3000',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: updateEndpoints,
                      ),
                      SizedBox(height: 16),
                      _buildExpandableSection(
                        'Specific Endpoints',
                        [
                          _buildTextField(_verifyEndpointController, 'Verify Endpoint URL'),
                          SizedBox(height: 16),
                          _buildTextField(_validateEndpointController, 'Validate Endpoint URL'),
                          SizedBox(height: 16),
                          _buildTextField(_credentialsEndpointController, 'Credentials Endpoint URL'),
                          SizedBox(height: 16),
                          _buildTextField(_metadataEndpointController, 'Metadata Endpoint URL'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: ElevatedButton(
                onPressed: _saveSettings,
                child: Text('Save Settings'),
                style: ElevatedButton.styleFrom(
                  padding: EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
            SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: ElevatedButton(
                onPressed: _deleteAppData,
                child: Text('Delete App Data'),
                style: ElevatedButton.styleFrom(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: Theme.of(context).colorScheme.error,
                  foregroundColor: Theme.of(context).colorScheme.onError,
                ),
              ),
            ),
            SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}