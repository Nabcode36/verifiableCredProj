// Import necessary packages and files
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'add_trusted_issuer_screen.dart';
import 'manage_trusted_issuers_screen.dart';

/// CredentialSearchScreen is a StatefulWidget that allows users to search for credentials
/// based on type and property, and filter results by trusted issuers.
class CredentialSearchScreen extends StatefulWidget {
  final String searchEndpoint;

  CredentialSearchScreen({required this.searchEndpoint});

  @override
  _CredentialSearchScreenState createState() => _CredentialSearchScreenState();
}

class _CredentialSearchScreenState extends State<CredentialSearchScreen> with SingleTickerProviderStateMixin {
  // State variables
  bool _isLoading = false;
  List<Map<String, dynamic>> _jsonData = [];
  String? _selectedType;
  List<String> _subClassHierarchyIds = [];
  String? _selectedProperty;
  bool _useTrustedIssuers = false;
  Map<String, bool> _selectedIssuers = {};
  Map<String, Map<String, bool>> _selectedCredentials = {};
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadJsonData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  /// Loads JSON data from a local file containing schema.org definitions
  Future<void> _loadJsonData() async {
    setState(() => _isLoading = true);
    try {
      String jsonString = await rootBundle.loadString('assets/schemaorg-current-http.jsonld');
      final jsonData = json.decode(jsonString);
      if (jsonData.containsKey('@graph') && jsonData['@graph'] is List) {
        setState(() => _jsonData = List<Map<String, dynamic>>.from(jsonData['@graph']));
      } else {
        throw Exception('Invalid JSON structure');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error loading data: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  /// Returns a list of type suggestions based on the user's input query
  List<String> _getTypeSuggestions(String query) {
    return _jsonData
        .where((item) => item['@type'] == 'rdfs:Class')
        .map((item) => item['rdfs:label'].toString())
        .where((label) => label.toLowerCase().contains(query.toLowerCase()))
        .take(5)
        .toList();
  }

  /// Returns a list of property suggestions based on the user's input query and selected type
  List<String> _getPropertySuggestions(String query) {
    if (_subClassHierarchyIds.isEmpty) return [];

    return _jsonData
        .where((item) =>
    item['@type'] == 'rdf:Property' &&
        _isDomainIncludedInHierarchy(item)
    )
        .map((item) => item['rdfs:label'].toString())
        .where((label) => label.toLowerCase().contains(query.toLowerCase()))
        .take(5)
        .toList();
  }

  /// Checks if the domain of a property is included in the current type hierarchy
  bool _isDomainIncludedInHierarchy(Map<String, dynamic> item) {
    if (!item.containsKey('schema:domainIncludes')) return false;
    var domainIncludes = item['schema:domainIncludes'];
    if (domainIncludes is List) {
      return domainIncludes.any((domain) => _subClassHierarchyIds.contains(domain['@id']));
    } else if (domainIncludes is Map) {
      return _subClassHierarchyIds.contains(domainIncludes['@id']);
    }
    return false;
  }

  /// Updates the subclass hierarchy information based on the selected type
  void _updateSubClassInfo(String? selectedType) {
    if (selectedType == null) {
      setState(() {
        _subClassHierarchyIds = [];
        _selectedProperty = null; // Reset selected property when type changes
      });
      return;
    }

    List<String> hierarchyIds = [];
    String? currentId = _jsonData.firstWhere(
          (item) => item['rdfs:label'] == selectedType,
      orElse: () => {},
    )['@id'];

    while (currentId != null && currentId != "schema:Thing") {
      hierarchyIds.add(currentId!);
      var currentItem = _jsonData.firstWhere(
            (item) => item['@id'] == currentId,
        orElse: () => {},
      );

      if (currentItem.isNotEmpty && currentItem.containsKey('rdfs:subClassOf') && currentItem['rdfs:subClassOf'] is Map) {
        currentId = currentItem['rdfs:subClassOf']['@id'] as String?;
      } else {
        currentId = null;
      }
    }

    if (currentId == "schema:Thing") {
      hierarchyIds.add(currentId!);
    }

    setState(() {
      _subClassHierarchyIds = hierarchyIds;
      _selectedProperty = null; // Reset selected property when type changes
    });
  }

  /// Fetches issuers and credentials from the search endpoint
  Future<void> _fetchIssuersAndCredentials() async {
    if (!_useTrustedIssuers) return;
    setState(() => _isLoading = true);

    try {
      final prefs = await SharedPreferences.getInstance();
      List<String> trustedIssuers = prefs.getStringList('trusted_issuers') ?? [];
      final response = await http.get(
        Uri.parse(widget.searchEndpoint).replace(
          queryParameters: {
            'type': _selectedType,
            'property': _selectedProperty,
            'trusted_issuers': jsonEncode(trustedIssuers),
          },
        ),
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        setState(() {
          _selectedIssuers.clear();
          _selectedCredentials.clear();
          data.forEach((issuer, credentials) {
            _selectedIssuers[issuer] = false;
            _selectedCredentials[issuer] = Map.fromEntries(
                (credentials as List).map((credential) => MapEntry(credential.toString(), false))
            );
          });
        });
      } else {
        throw Exception('Failed to load issuers and credentials');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  /// Builds an autocomplete text field for type and property selection
  Widget _buildAutocompleteField(String label, List<String> Function(String) getSuggestions, void Function(String?) onSelected) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Autocomplete<String>(
        optionsBuilder: (TextEditingValue textEditingValue) =>
        textEditingValue.text.isEmpty ? [] : getSuggestions(textEditingValue.text),
        onSelected: onSelected,
        fieldViewBuilder: (context, textEditingController, focusNode, onFieldSubmitted) =>
            TextField(
              controller: textEditingController,
              focusNode: focusNode,
              decoration: InputDecoration(
                labelText: label,
                border: OutlineInputBorder(),
                suffixIcon: Icon(Icons.search),
              ),
            ),
      ),
    );
  }

  /// Builds a list of issuers with checkboxes for selection
  Widget _buildIssuerList() {
    return ListView(
      children: _selectedIssuers.keys.map((issuer) => CheckboxListTile(
        title: Text(issuer),
        value: _selectedIssuers[issuer],
        onChanged: (bool? value) {
          setState(() {
            _selectedIssuers[issuer] = value!;
            _selectedCredentials[issuer]!.updateAll((_, __) => value);
          });
        },
      )).toList(),
    );
  }

  /// Builds a list of credentials with checkboxes for selection
  Widget _buildCredentialList() {
    return ListView(
      children: _selectedCredentials.entries.expand((entry) {
        String issuer = entry.key;
        Map<String, bool> credentials = entry.value;
        return credentials.keys.map((credential) => CheckboxListTile(
          title: Text(credential),
          subtitle: Text(issuer),
          value: _selectedCredentials[issuer]![credential],
          onChanged: (bool? value) {
            setState(() {
              _selectedCredentials[issuer]![credential] = value!;
              if (!value) _selectedIssuers[issuer] = false;
            });
          },
        ));
      }).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Credential Search')),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
        child: Column(
          children: [
            // Search fields
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildAutocompleteField('Search Type', _getTypeSuggestions, (selection) {
                    setState(() => _selectedType = selection);
                    _updateSubClassInfo(selection);
                  }),
                  SizedBox(height: 16),
                  _buildAutocompleteField('Search Property', _getPropertySuggestions, (selection) {
                    setState(() => _selectedProperty = selection);
                  }),
                ],
              ),
            ),
            // Issuer selection
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                children: [
                  Expanded(
                    child: RadioListTile<bool>(
                      title: Text('All Issuers'),
                      value: false,
                      groupValue: _useTrustedIssuers,
                      onChanged: (value) => setState(() => _useTrustedIssuers = value!),
                    ),
                  ),
                  Expanded(
                    child: RadioListTile<bool>(
                      title: Text('Trusted Issuers'),
                      value: true,
                      groupValue: _useTrustedIssuers,
                      onChanged: (value) {
                        setState(() => _useTrustedIssuers = value!);
                        if (_useTrustedIssuers) _fetchIssuersAndCredentials();
                      },
                    ),
                  ),
                ],
              ),
            ),
            // Issuer and credential lists
            if (_useTrustedIssuers) ...[
              TabBar(
                controller: _tabController,
                tabs: [Tab(text: 'Issuers'), Tab(text: 'Credentials')],
              ),
              SizedBox(
                height: 300,
                child: TabBarView(
                  controller: _tabController,
                  children: [_buildIssuerList(), _buildCredentialList()],
                ),
              ),
            ],
          ],
        ),
      ),
      // Floating action buttons for adding and managing trusted issuers
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            onPressed: () async {
              final result = await Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => AddTrustedIssuerScreen()),
              );
              if (result == true) _fetchIssuersAndCredentials();
            },
            child: Icon(Icons.add),
            heroTag: 'addIssuer',
            tooltip: 'Add Trusted Issuer',
          ),
          SizedBox(height: 16),
          FloatingActionButton(
            onPressed: () async {
              final result = await Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const ManageTrustedIssuersScreen(title: 'Manage Issuers',)),
              );
              if (result == true) _fetchIssuersAndCredentials();
            },
            child: Icon(Icons.settings),
            heroTag: 'manageIssuers',
            tooltip: 'Manage Trusted Issuers',
          ),
        ],
      ),
    );
  }
}