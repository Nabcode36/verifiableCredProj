// Import necessary packages
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

/// A StatefulWidget for adding trusted issuers to the app.
class AddTrustedIssuerScreen extends StatefulWidget {
  @override
  _AddTrustedIssuerScreenState createState() => _AddTrustedIssuerScreenState();
}

/// The state for the AddTrustedIssuerScreen widget.
class _AddTrustedIssuerScreenState extends State<AddTrustedIssuerScreen> {
  // Controllers for the text input fields
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _manualDidController = TextEditingController();

  // List to store search results
  List<Map<String, dynamic>> _searchResults = [];

  // Flag to indicate if a search is in progress
  bool _isLoading = false;

  /// Searches for issuers based on the given query.
  ///
  /// This method makes an API call to search for issuers and updates the
  /// [_searchResults] list with the response.
  Future<void> _searchIssuers(String query) async {
    setState(() {
      _isLoading = true;
    });

    // TODO: Implement the actual API call to search for issuers
    // This is a placeholder implementation
    try {
      final response = await http.get(Uri.parse('https://example.com/search_issuers?query=$query'));
      if (response.statusCode == 200) {
        setState(() {
          _searchResults = List<Map<String, dynamic>>.from(json.decode(response.body));
        });
      } else {
        throw Exception('Invalid Registry');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error searching issuers: $e')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Adds a trusted issuer to the app's storage.
  ///
  /// This method validates the DID, checks if it's already trusted,
  /// and adds it to the list of trusted issuers if it's new.
  Future<void> _addTrustedIssuer(String did) async {
    // Validate the DID format
    if (!did.startsWith('did:web:')) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Invalid DID:web address')),
      );
      return;
    }

    try {
      // Get the SharedPreferences instance
      final prefs = await SharedPreferences.getInstance();

      // Retrieve the list of trusted issuers or create an empty list if it doesn't exist
      List<String> trustedIssuers = prefs.getStringList('trusted_issuers') ?? [];

      // Check if the DID is not already in the list
      if (!trustedIssuers.contains(did)) {
        // Add the new DID to the list
        trustedIssuers.add(did);

        // Save the updated list back to SharedPreferences
        await prefs.setStringList('trusted_issuers', trustedIssuers);

        // Show a success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Trusted issuer added successfully')),
        );

        // Close the screen and return true to indicate success
        Navigator.of(context).pop(true);
      } else {
        // Show a message if the issuer is already trusted
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('This issuer is already trusted')),
        );
      }
    } catch (e) {
      // Show an error message if something goes wrong
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error adding trusted issuer: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Add Trusted Issuer'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Search field for issuer registry
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                labelText: 'Add issuer registry',
                border: OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: Icon(Icons.search),
                  onPressed: () => _searchIssuers(_searchController.text),
                ),
              ),
            ),
            SizedBox(height: 16),

            // List of search results or loading indicator
            Expanded(
              child: _isLoading
                  ? Center(child: CircularProgressIndicator())
                  : ListView.builder(
                itemCount: _searchResults.length,
                itemBuilder: (context, index) {
                  final issuer = _searchResults[index];
                  return ListTile(
                    title: Text(issuer['name']),
                    subtitle: Text(issuer['did']),
                    onTap: () => _addTrustedIssuer(issuer['did']),
                  );
                },
              ),
            ),
            SizedBox(height: 16),

            // Manual DID:web address input section
            Text('Or add DID:web address manually:', style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            TextField(
              controller: _manualDidController,
              decoration: InputDecoration(
                labelText: 'DID:web Address',
                border: OutlineInputBorder(),
                hintText: 'did:web:example.com',
              ),
            ),
            SizedBox(height: 16),

            // Button to add manually entered DID
            ElevatedButton(
              onPressed: () => _addTrustedIssuer(_manualDidController.text),
              child: Text('Add Trusted Issuer'),
              style: ElevatedButton.styleFrom(
                padding: EdgeInsets.symmetric(vertical: 15),
              ),
            ),
          ],
        ),
      ),
    );
  }
}