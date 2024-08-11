// Import necessary packages
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

/// Widget for displaying credential information
class CredentialDisplayScreen extends StatefulWidget {
  final List<Map<String, dynamic>> credentials;
  final bool isFromHistory;

  CredentialDisplayScreen({required this.credentials, this.isFromHistory = false});

  @override
  _CredentialDisplayScreenState createState() => _CredentialDisplayScreenState();
}

class _CredentialDisplayScreenState extends State<CredentialDisplayScreen> {
  // List to store trusted issuers
  List<String> _trustedIssuers = [];

  // Map to store grouped credentials
  late Map<String, List<Map<String, dynamic>>> _groupedCredentials;

  @override
  void initState() {
    super.initState();
    _loadTrustedIssuers();
    _groupCredentials();
  }

  /// Load trusted issuers from SharedPreferences
  Future<void> _loadTrustedIssuers() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _trustedIssuers = prefs.getStringList('trusted_issuers') ?? [];
    });
  }

  /// Group credentials by their type
  void _groupCredentials() {
    _groupedCredentials = {};
    for (var credential in widget.credentials) {
      final cred = credential['_cred']?.toString() ?? 'Uncategorized';
      if (!_groupedCredentials.containsKey(cred)) {
        _groupedCredentials[cred] = [];
      }
      _groupedCredentials[cred]!.add(credential);
    }
    print('Grouped credentials: $_groupedCredentials'); // Debug print
  }

  /// Build a card widget for displaying credential information
  Widget _buildCredentialCard(String credType, List<Map<String, dynamic>> credentials, ColorScheme colorScheme) {
    final issuer = credentials.first['_issuer']?.toString() ?? '';
    final isTrusted = _trustedIssuers.contains(issuer);
    final displayIssuer = issuer.split(':').length >= 3 ? issuer.split(':')[2] : issuer;

    return Card(
      elevation: 2,
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          leading: _buildAvatar(credentials.length, colorScheme),
          title: Text(
            credType,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: colorScheme.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
          subtitle: Padding(
            padding: EdgeInsets.only(top: 8),
            child: Wrap(
              children: [
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceVariant,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isTrusted) ...[
                        Icon(
                          Icons.verified_user,
                          color: Colors.green,
                          size: 14,
                        ),
                        SizedBox(width: 4),
                      ],
                      Text(
                        displayIssuer,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          tilePadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          expandedCrossAxisAlignment: CrossAxisAlignment.start,
          childrenPadding: EdgeInsets.zero,
          children: [
            Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: credentials.map((credential) {
                  // Extract the _key and _value from each credential
                  final key = credential['_key'];
                  final value = credential['_value'];

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        processFieldName(key),
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: colorScheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        value.toString(),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurface,
                        ),
                      ),
                      SizedBox(height: 16),
                    ],
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build an avatar widget displaying the count of credentials
  Widget _buildAvatar(int count, ColorScheme colorScheme) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: colorScheme.primary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          count.toString(),
          style: TextStyle(
            color: colorScheme.onPrimary,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  /// Process the field name for display
  String processFieldName(String field) {
    if (field.startsWith(r'$.')) {
      field = field.substring(2);
    }
    List<String> parts = field.split('.');
    List<String> processedParts = parts.map((part) {
      return part.split(RegExp(r'(?=[A-Z])'))
          .map((word) => word.isNotEmpty ? '${word[0].toUpperCase()}${word.substring(1)}' : '')
          .join(' ');
    }).toList();
    if (processedParts.isNotEmpty && processedParts[0] == 'Credential Subject') {
      processedParts.removeAt(0);
    }
    return processedParts.join(' > ');
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('Credential Results'),
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
      ),
      body: _groupedCredentials.isEmpty
          ? Center(child: Text('No credentials to display'))
          : ListView.builder(
        itemCount: _groupedCredentials.length,
        itemBuilder: (context, index) {
          final credType = _groupedCredentials.keys.elementAt(index);
          final credentials = _groupedCredentials[credType]!;
          return _buildCredentialCard(credType, credentials, colorScheme);
        },
      ),
      backgroundColor: colorScheme.background,
    );
  }
}