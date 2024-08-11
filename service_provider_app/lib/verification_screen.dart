// Import necessary packages
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:convert';
import 'dart:math';
import 'credential_display_screen.dart';

/// A StatefulWidget that handles the verification process.
/// It displays a QR code and allows manual input of a verification code.
class VerificationScreen extends StatefulWidget {
  final String verifyEndpoint;
  final String validateEndpoint;
  final String secretToken;
  final String title;

  VerificationScreen({
    required this.verifyEndpoint,
    required this.validateEndpoint,
    required this.secretToken,
    required this.title
  });

  @override
  _VerificationScreenState createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  // State variables
  String _qrData = '';
  String _responseEndpoint = '';
  String _transactionId = '';
  bool _isLoading = true;
  bool? _validationResult;
  final TextEditingController _validationCodeController = TextEditingController();
  late String _verificationEndpoint;
  late String _validationEndpoint;
  late String _secretToken;

  @override
  void initState() {
    super.initState();
    // Load verification endpoint and send initial request
    _loadVerificationEndpoint().then((_) => _sendVerificationRequest());
  }

  /// Loads verification endpoints and secret token from SharedPreferences
  Future<void> _loadVerificationEndpoint() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _verificationEndpoint = prefs.getString('verify_endpoint') ?? '';
      _validationEndpoint = prefs.getString('validate_endpoint') ?? '';
      _secretToken = prefs.getString('secret_token') ?? '';
    });
  }

  @override
  void dispose() {
    _validationCodeController.dispose();
    super.dispose();
  }

  /// Generates a secure random nonce for the verification request
  String _generateNonce() {
    final random = Random.secure();
    final values = List<int>.generate(32, (i) => random.nextInt(256));
    return base64Url.encode(values);
  }

  /// Sends a verification request to the server and updates the QR code
  Future<void> _sendVerificationRequest() async {
    setState(() {
      _isLoading = true;
      _validationResult = null;
    });

    try {
      final nonce = _generateNonce();
      final response = await http.post(
        Uri.parse(_verificationEndpoint),
        headers: <String, String>{
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $_secretToken',
        },
        body: jsonEncode(<String, String>{
          'secret_token': _secretToken,
          'nonce': nonce,
        }),
      );

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body);
        setState(() {
          _responseEndpoint = jsonResponse['response_uri'] ?? '';
          _transactionId = jsonResponse['transaction_id'] ?? '';
          _qrData = _responseEndpoint;
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to verify');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to verify. Please try again.')),
      );
    }
  }

  /// Sends a validation request to the server with the entered code
  Future<void> _sendValidationRequest() async {
    final validationCode = _validationCodeController.text;
    if (validationCode.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please enter a 6-character code.')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final Uri uri = Uri.parse(_validationEndpoint).replace(
        queryParameters: {
          'transaction_id': _transactionId,
          'response_code': validationCode,
        },
      );

      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_secretToken',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonResponse = jsonDecode(response.body);
        final List<Map<String, dynamic>> credentials = jsonResponse
            .map((item) => Map<String, dynamic>.from(item))
            .toList();

        // Add the transaction ID to each credential
        for (var credential in credentials) {
          credential['transaction_id'] = _transactionId;
        }

        final result = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => CredentialDisplayScreen(credentials: credentials),
          ),
        );

        // After returning from CredentialDisplayScreen, pop and return the credentials
        Navigator.pop(context, {'credentials': credentials});
      } else {
        throw Exception('Failed to validate');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to validate. Please try again.')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Builds a widget to display the validation result
  Widget _buildValidationResult() {
    if (_validationResult == null) return SizedBox.shrink();

    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _validationResult! ? Colors.green[100] : Colors.red[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            _validationResult! ? Icons.check_circle : Icons.error,
            color: _validationResult! ? Colors.green : Colors.red,
          ),
          SizedBox(width: 16),
          Expanded(
            child: Text(
              _validationResult! ? 'Validation Successful' : 'Validation Failed',
              style: TextStyle(
                color: _validationResult! ? Colors.green[800] : Colors.red[800],
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Hero(
          tag: widget.title,
          child: Material(
            color: Colors.transparent,
            child: Text(
              widget.title,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
          ),
        ),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16.0, 0, 16.0, 16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_qrData.isNotEmpty)
                Column(
                  children: [
                    SizedBox(height: 20),
                    // Display QR code
                    Center(
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: EdgeInsets.all(10),
                        child: QrImageView(
                          data: _qrData,
                          version: QrVersions.auto,
                          size: 200.0,
                          backgroundColor: Colors.white,
                        ),
                      ),
                    ),
                    SizedBox(height: 20),
                    Text('Transaction ID: $_transactionId'),
                  ],
                )
              else
                Center(
                  child: Text(
                    'Failed to generate QR code. Please try again.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 18, color: Colors.red),
                  ),
                ),
              SizedBox(height: 30),
              // Input field for validation code
              TextField(
                controller: _validationCodeController,
                decoration: InputDecoration(
                  labelText: 'Enter 6-character code',
                  border: OutlineInputBorder(),
                ),
                maxLength: 6,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 24, letterSpacing: 8),
              ),
              SizedBox(height: 16),
              // Validate button
              ElevatedButton(
                onPressed: _sendValidationRequest,
                child: Text('Validate'),
                style: ElevatedButton.styleFrom(
                  padding: EdgeInsets.symmetric(vertical: 15),
                ),
              ),
              SizedBox(height: 16),
              // Display validation result
              _buildValidationResult(),
            ],
          ),
        ),
      ),
      // Floating action button to retry verification
      floatingActionButton: FloatingActionButton(
        onPressed: _sendVerificationRequest,
        child: Icon(Icons.refresh),
        tooltip: 'Retry Verification',
      ),
    );
  }
}