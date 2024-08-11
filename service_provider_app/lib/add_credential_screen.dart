// Import necessary packages and files
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'add_field_screen.dart';
import 'package:http/http.dart' as http;

/// Widget for adding a new credential
/// This screen allows users to input credential details, add fields,
/// and set filters for issuers and credential types.
class AddCredentialScreen extends StatefulWidget {
  // Callback function to be called when a new credential is added
  final Function onCredentialAdded;

  AddCredentialScreen({required this.onCredentialAdded});

  @override
  _AddCredentialScreenState createState() => _AddCredentialScreenState();
}

class _AddCredentialScreenState extends State<AddCredentialScreen> with SingleTickerProviderStateMixin {
  // Form key for validation
  final _formKey = GlobalKey<FormState>();

  // Controllers for text input fields
  final _nameController = TextEditingController();
  final _purposeController = TextEditingController();

  // Automatically generated ID based on the name
  String _id = '';

  // List to store field data (path and filter)
  List<Map<String, String>> _fields = [];

  // Tab controller for managing Fields and Filters tabs
  late TabController _tabController;

  // Selected filter options
  String _selectedIssuerFilter = 'All';
  String _selectedCredentialFilter = 'All';

  // List of trusted issuers and their selection status
  List<String> _trustedIssuers = [];
  List<bool> _selectedIssuers = [];

  // Checkboxes for credential options (placeholder, not fully implemented)
  List<bool> _credentialCheckboxes = List.generate(5, (_) => false);

  @override
  void initState() {
    super.initState();
    // Initialize tab controller with 2 tabs (Fields and Filters)
    _tabController = TabController(length: 2, vsync: this);
    // Load trusted issuers from local storage
    _loadTrustedIssuers();
  }

  /// Load trusted issuers from SharedPreferences
  /// This populates the _trustedIssuers list and initializes _selectedIssuers
  Future<void> _loadTrustedIssuers() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _trustedIssuers = prefs.getStringList('trusted_issuers') ?? [];
      _selectedIssuers = List.generate(_trustedIssuers.length, (_) => false);
    });
  }

  @override
  void dispose() {
    // Clean up controllers when the widget is disposed
    _nameController.dispose();
    _purposeController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  /// Update the ID based on the name input
  /// Converts the name to lowercase, replaces spaces with hyphens,
  /// and removes any characters that are not alphanumeric or hyphens
  void _updateId(String name) {
    setState(() {
      _id = name.toLowerCase()
          .replaceAll(RegExp(r'\s+'), '-')
          .replaceAll(RegExp(r'[^a-z0-9\-]'), '');
    });
  }

  /// Navigate to AddFieldScreen to add a new field
  /// When a field is added, it updates the _fields list
  void _addField() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => AddFieldScreen(
        onFieldAdded: (fieldData) {
          setState(() {
            _fields.add(fieldData);
          });
        },
      )),
    );
  }

  /// Remove a field from the list at the specified index
  void _removeField(int index) {
    setState(() {
      _fields.removeAt(index);
    });
  }

  /// Confirm and save the new credential
  /// Validates the form, creates a credential object, and calls the onCredentialAdded callback
  void _confirmCredential() async {
    if (_formKey.currentState!.validate()) {
      final credential = {
        'name': _nameController.text,
        'purpose': _purposeController.text,
        'id': _id,
        'fields': _fields,
        'issuerFilter': _selectedIssuerFilter,
        'credentialFilter': _selectedCredentialFilter,
        'selectedIssuers': _trustedIssuers.asMap().entries
            .where((entry) => _selectedIssuers[entry.key])
            .map((entry) => entry.value)
            .toList(),
        'selectedCredentialOptions': _credentialCheckboxes
            .asMap()
            .entries
            .where((entry) => entry.value)
            .map((entry) => 'Option ${entry.key + 1}')
            .toList(),
      };

      widget.onCredentialAdded(credential);
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Add New Credential'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'Fields'),
            Tab(text: 'Filters'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildFieldsTab(),
          _buildFiltersTab(),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Button to add a new field
          FloatingActionButton(
            onPressed: _addField,
            child: Icon(Icons.add),
            heroTag: 'addFieldFAB',
            tooltip: 'Add Field',
          ),
          SizedBox(height: 16),
          // Button to confirm and save the credential
          FloatingActionButton(
            onPressed: _confirmCredential,
            child: Icon(Icons.check),
            heroTag: 'confirmCredentialFAB',
            tooltip: 'Confirm Credential',
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
    );
  }

  /// Build the Fields tab content
  /// This includes input fields for name and purpose, displays the generated ID,
  /// and shows a list of added fields with the option to remove them
  Widget _buildFieldsTab() {
    return Form(
      key: _formKey,
      child: ListView(
        padding: EdgeInsets.all(16.0),
        children: [
          // Name input field
          TextFormField(
            controller: _nameController,
            decoration: InputDecoration(
              labelText: 'Name',
              border: OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please enter a name';
              }
              return null;
            },
            onChanged: (value) {
              _updateId(value);
            },
          ),
          SizedBox(height: 16.0),
          // Display generated ID
          Text(
            'ID: $_id',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 16.0),
          // Purpose input field
          TextFormField(
            controller: _purposeController,
            decoration: InputDecoration(
              labelText: 'Purpose',
              border: OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please enter a purpose';
              }
              return null;
            },
          ),
          SizedBox(height: 24.0),
          Text(
            'Fields',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 8.0),
          // List of added fields
          ListView.builder(
            shrinkWrap: true,
            physics: NeverScrollableScrollPhysics(),
            itemCount: _fields.length,
            itemBuilder: (context, index) {
              return ListTile(
                title: Text(_fields[index]['path'] ?? ''),
                subtitle: Text(_fields[index]['filter'] ?? ''),
                trailing: IconButton(
                  icon: Icon(Icons.delete),
                  onPressed: () => _removeField(index),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  /// Build the Filters tab content
  /// This includes options for selecting issuer filters and displaying
  /// a list of trusted issuers when 'Selected' filter is chosen
  Widget _buildFiltersTab() {
    return ListView(
      padding: EdgeInsets.all(16.0),
      children: [
        Text('Issuers', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        SizedBox(height: 8.0),
        // Issuer filter selection
        SegmentedButton<String>(
          segments: [
            ButtonSegment(value: 'All', label: Text('All')),
            ButtonSegment(value: 'Trusted', label: Text('Trusted')),
            ButtonSegment(value: 'Selected', label: Text('Selected')),
          ],
          selected: {_selectedIssuerFilter},
          onSelectionChanged: (Set<String> newSelection) {
            setState(() {
              _selectedIssuerFilter = newSelection.first;
            });
          },
        ),
        // Display trusted issuers list when 'Selected' filter is chosen
        if (_selectedIssuerFilter == 'Selected') ...[
          SizedBox(height: 16.0),
          ExpansionTile(
            title: Text('Issuer Options (${_selectedIssuers.where((isSelected) => isSelected).length} selected)'),
            children: List.generate(
              _trustedIssuers.length,
                  (index) => CheckboxListTile(
                title: Text(_trustedIssuers[index]),
                value: _selectedIssuers[index],
                onChanged: (bool? value) {
                  setState(() {
                    _selectedIssuers[index] = value!;
                  });
                },
              ),
            ),
          ),
        ],
        SizedBox(height: 24.0),
      ],
    );
  }
}