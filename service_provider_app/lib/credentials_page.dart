// Import necessary packages
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:animations/animations.dart';
import 'add_credential_screen.dart';
import 'presentation_definition_screen.dart';

/// CredentialsPage is a stateful widget that displays and manages user credentials.
/// It allows users to view, add, and delete credentials, as well as view the presentation definition.
class CredentialsPage extends StatefulWidget {
  final String credentialsEndpoint;
  final String title;

  const CredentialsPage({Key? key, required this.credentialsEndpoint, required this.title}) : super(key: key);

  @override
  CredentialsPageState createState() => CredentialsPageState();
}

/// CredentialsPageState manages the state and logic for the CredentialsPage.
class CredentialsPageState extends State<CredentialsPage> {
  List<Map<String, dynamic>> _credentials = []; // List to store user credentials
  Map<String, dynamic>? _presentationDefinition; // Stores the presentation definition
  Set<int> _expandedIndices = {}; // Keeps track of expanded credential cards
  bool _isLoading = false; // Loading state flag
  late String _credentialsEndpoint; // API endpoint for credentials
  late String _secretToken; // Authentication token

  @override
  void initState() {
    super.initState();
    _loadCredentialsEndpoint().then((_) => _loadCredentials());
  }

  /// Loads the credentials endpoint and secret token from SharedPreferences.
  Future<void> _loadCredentialsEndpoint() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _credentialsEndpoint = prefs.getString('credentials_endpoint') ?? '';
      _secretToken = prefs.getString('secret_token') ?? '';
    });
  }

  /// Loads credentials, first attempting to fetch from the server, then falling back to local storage.
  Future<void> _loadCredentials() async {
    setState(() {
      _isLoading = true;
    });

    try {
      await _fetchCredentialsFromServer();
    } catch (e) {
      print('Error fetching credentials from server: $e');
      await _loadCredentialsFromLocal();
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Fetches credentials from the server using the stored endpoint and token.
  Future<void> _fetchCredentialsFromServer() async {
    try {
      final response = await http.get(
        Uri.parse(_credentialsEndpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_secretToken',
        },
      );

      if (response.statusCode == 200) {
        List<dynamic> decodedList = json.decode(response.body);
        _credentials = decodedList.map((item) =>
        Map<String, dynamic>.from(item as Map<String, dynamic>)
        ).toList();

        await _saveCredentialsToLocal();
        await _updatePresentationDefinition();

        print('Credentials fetched successfully from server');
      } else {
        throw Exception('Failed to load credentials from server');
      }
    } catch (e) {
      print('Error fetching credentials from server: $e');
      throw e;
    }
  }

  /// Loads credentials from local storage if server fetch fails.
  Future<void> _loadCredentialsFromLocal() async {
    final prefs = await SharedPreferences.getInstance();
    final credentialStrings = prefs.getStringList('credentials') ?? [];
    _credentials = credentialStrings.map((str) => json.decode(str) as Map<String, dynamic>).toList();
    print('Credentials loaded from local storage');
  }

  /// Saves the current credentials to local storage.
  Future<void> _saveCredentialsToLocal() async {
    final prefs = await SharedPreferences.getInstance();
    List<String> credentialStrings = _credentials.map((cred) => json.encode(cred)).toList();
    await prefs.setStringList('credentials', credentialStrings);
  }

  /// Updates the presentation definition by sending current credentials to the server.
  Future<void> _updatePresentationDefinition() async {
    try {
      final response = await http.post(
        Uri.parse(_credentialsEndpoint),
        headers: <String, String>{
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $_secretToken',
        },
        body: jsonEncode(_credentials),
      );

      if (response.statusCode == 200) {
        setState(() {
          _presentationDefinition = json.decode(response.body);
        });
        print('Presentation definition updated successfully');
      } else {
        print('Failed to update presentation definition. Status code: ${response.statusCode}');
      }
    } catch (e) {
      print('Error updating presentation definition: $e');
    }
  }

  /// Adds a new credential to the list and updates server and local storage.
  Future<void> addNewCredential(Map<String, dynamic> newCredential) async {
    setState(() {
      _isLoading = true;
    });

    try {
      _credentials.add(newCredential);
      await _saveCredentials();
      await _sendCredentialsToEndpoint();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('New credential added successfully')),
      );
    } catch (e) {
      print('Error adding new credential: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to add new credential')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Navigates to the AddCredentialScreen to add a new credential.
  void _addNewCredential() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddCredentialScreen(
          onCredentialAdded: (newCredential) {
            addNewCredential(newCredential);
          },
        ),
      ),
    );
  }

  /// Sends the current list of credentials to the server endpoint.
  Future<void> _sendCredentialsToEndpoint() async {
    try {
      print('Sending credentials to endpoint: $_credentialsEndpoint');
      print('Credentials data: ${json.encode(_credentials)}');

      final response = await http.post(
        Uri.parse(_credentialsEndpoint),
        headers: <String, String>{
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer $_secretToken',
        },
        body: jsonEncode(_credentials),
      );

      if (response.statusCode == 200) {
        setState(() {
          _presentationDefinition = json.decode(response.body);
        });
        print('Credentials sent successfully');
      } else {
        print('Failed to send credentials. Status code: ${response.statusCode}');
        throw Exception('Failed to send credentials');
      }
    } catch (e) {
      print('Error sending credentials: $e');
      throw e;
    }
  }

  /// Refreshes the credentials by fetching the latest data from the server.
  Future<void> refreshCredentials() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await http.get(
        Uri.parse(_credentialsEndpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_secretToken',
        },
      );

      if (response.statusCode == 200) {
        await _updateCredentialsFromJson(response.body);
        await _loadCredentials();
      } else {
        throw Exception('Failed to load credentials');
      }
    } catch (e) {
      print('Error refreshing credentials: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to refresh credentials')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Updates the credentials list from a JSON string.
  Future<void> _updateCredentialsFromJson(String jsonString) async {
    try {
      List<dynamic> decodedList = json.decode(jsonString);
      List<Map<String, dynamic>> credentials = decodedList.map((item) =>
      Map<String, dynamic>.from(item as Map<String, dynamic>)
      ).toList();

      await _saveCredentials();

      setState(() {
        _credentials = credentials;
      });

      print('Credentials updated successfully');
    } catch (e) {
      print('Error updating credentials: $e');
      throw e;
    }
  }

  /// Saves the current list of credentials to local storage.
  Future<void> _saveCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    List<String> credentialStrings = _credentials.map((cred) => json.encode(cred)).toList();
    await prefs.setStringList('credentials', credentialStrings);
  }

  /// Deletes a credential at the specified index and updates server and local storage.
  Future<void> _deleteCredential(int index) async {
    setState(() {
      _isLoading = true;
    });

    try {
      _credentials.removeAt(index);
      await _saveCredentials();
      await _sendCredentialsToEndpoint();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Credential deleted successfully')),
      );
    } catch (e) {
      print('Error deleting credential: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to delete credential')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Navigates to the PresentationDefinitionScreen to show the current presentation definition.
  void _showPresentationDefinition() {
    if (_presentationDefinition != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => PresentationDefinitionScreen(
            presentationDefinition: _presentationDefinition!,
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Presentation Definition not available')),
      );
    }
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
          : CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: InkWell(
                  onTap: _showPresentationDefinition,
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Presentation Definition',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Tap to view the current presentation definition',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        SizedBox(height: 16),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Icon(Icons.arrow_forward),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Credentials',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  IconButton(
                    icon: Icon(Icons.refresh),
                    onPressed: refreshCredentials,
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Card.filled(
                color: Theme.of(context).colorScheme.surfaceContainer,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: _credentials.isEmpty
                      ? Center(
                    child: Text(
                      'No Credentials Added',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  )
                      : ListView.builder(
                    shrinkWrap: true,
                    physics: NeverScrollableScrollPhysics(),
                    itemCount: _credentials.length,
                    itemBuilder: (context, index) {
                      final credential = _credentials[index];
                      return CredentialCard(
                        credential: credential,
                        isExpanded: _expandedIndices.contains(index),
                        onToggleExpand: () {
                          setState(() {
                            if (_expandedIndices.contains(index)) {
                              _expandedIndices.remove(index);
                            } else {
                              _expandedIndices.add(index);
                            }
                          });
                        },
                        onDelete: () => _showDeleteConfirmationDialog(index),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addNewCredential,
        child: Icon(Icons.add),
        tooltip: 'Add New Credential',
      ),
    );
  }

  void _showDeleteConfirmationDialog(int index) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Delete Credential'),
          content: Text('Are you sure you want to delete this credential?'),
          actions: <Widget>[
            TextButton(
              child: Text('Cancel'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
            TextButton(
              child: Text('Delete'),
              onPressed: () {
                Navigator.of(context).pop();
                _deleteCredential(index);
              },
            ),
          ],
        );
      },
    );
  }
}

class CredentialCard extends StatelessWidget {
  final Map<String, dynamic> credential;
  final bool isExpanded;
  final VoidCallback onToggleExpand;
  final VoidCallback onDelete;

  const CredentialCard({
    Key? key,
    required this.credential,
    required this.isExpanded,
    required this.onToggleExpand,
    required this.onDelete,
  }) : super(key: key);

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
    final ColorScheme colorScheme = Theme.of(context).colorScheme;

    final cardColor = colorScheme.surface;
    final textColor = colorScheme.onSurface;

    return AnimatedContainer(
      duration: Duration(milliseconds: 200),
      curve: Curves.easeInOut,
      margin: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: isExpanded ? 8 : 4,
            offset: Offset(0, isExpanded ? 4 : 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: _buildAvatar(context),
              title: Text(
                credential['name'],
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: textColor,
                ),
              ),
              subtitle: Text(
                credential['purpose'],
                style: TextStyle(
                  color: textColor.withOpacity(0.8),
                ),
              ),
              trailing: IconButton(
                icon: AnimatedSwitcher(
                  duration: Duration(milliseconds: 200),
                  child: Icon(
                    isExpanded ? Icons.expand_less : Icons.expand_more,
                    key: ValueKey<bool>(isExpanded),
                    color: textColor,
                  ),
                ),
                onPressed: onToggleExpand,
              ),
              onTap: onToggleExpand,
            ),
            ClipRect(
              child: AnimatedAlign(
                alignment: Alignment.topCenter,
                duration: Duration(milliseconds: 200),
                heightFactor: isExpanded ? 1.0 : 0.0,
                child: Column(
                  children: [
                    Divider(
                      color: textColor.withOpacity(0.2),
                      indent: 16,
                      endIndent: 16,
                    ),
                    Padding(
                      padding: EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Fields',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 8),
                          ...(credential['fields'] as List).map((field) => Padding(
                            padding: EdgeInsets.only(bottom: 8),
                            child: Text(
                              processFieldName(field['path'] ?? "None"),
                              style: TextStyle(color: textColor),
                            ),
                          )),
                          SizedBox(height: 16),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: ElevatedButton.icon(
                              icon: Icon(Icons.delete, color: colorScheme.onError),
                              label: Text('Remove'),
                              onPressed: onDelete,
                              style: ElevatedButton.styleFrom(
                                foregroundColor: colorScheme.onError,
                                backgroundColor: colorScheme.error,
                              ),
                            ),
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

  Widget _buildAvatar(BuildContext context) {
    final ColorScheme colorScheme = Theme.of(context).colorScheme;
    final String initial = credential['name'][0].toUpperCase();

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: colorScheme.primary,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: colorScheme.onPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ),
    );
  }
}