import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'add_trusted_issuer_screen.dart';

/// A screen widget for managing trusted issuers.
///
/// This widget displays a list of trusted issuers and provides functionality
/// to add new issuers or remove existing ones.
class ManageTrustedIssuersScreen extends StatefulWidget {
  final String title;

  const ManageTrustedIssuersScreen({Key? key, required this.title}) : super(key: key);

  @override
  ManageTrustedIssuersScreenState createState() => ManageTrustedIssuersScreenState();
}

class ManageTrustedIssuersScreenState extends State<ManageTrustedIssuersScreen> {
  // List to store trusted issuers
  List<String> _trustedIssuers = [];

  // Flag to indicate if data is being loaded
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTrustedIssuers();
  }

  /// Loads the list of trusted issuers from SharedPreferences.
  Future<void> _loadTrustedIssuers() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        _trustedIssuers = prefs.getStringList('trusted_issuers') ?? [];
        _isLoading = false;
      });
    }
  }

  /// Removes a trusted issuer from the list and updates SharedPreferences.
  ///
  /// [issuer] is the issuer to be removed.
  Future<void> _removeTrustedIssuer(String issuer) async {
    final prefs = await SharedPreferences.getInstance();
    _trustedIssuers.remove(issuer);
    await prefs.setStringList('trusted_issuers', _trustedIssuers);
    setState(() {});
  }

  /// Refreshes the list of trusted issuers.
  void refreshTrustedIssuers() {
    _loadTrustedIssuers();
  }

  /// Navigates to the AddTrustedIssuerScreen and refreshes the list if a new issuer is added.
  Future<void> _navigateToAddTrustedIssuer() async {
    final result = await Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => AddTrustedIssuerScreen()),
    );
    if (result == true) {
      refreshTrustedIssuers();
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
          : _trustedIssuers.isEmpty
          ? Center(child: Text('No trusted issuers'))
          : ListView.builder(
        itemCount: _trustedIssuers.length,
        itemBuilder: (context, index) {
          final issuer = _trustedIssuers[index];
          return Dismissible(
            key: Key(issuer),
            background: Container(
              color: Colors.red,
              alignment: Alignment.centerRight,
              padding: EdgeInsets.only(right: 20.0),
              child: Icon(Icons.delete, color: Colors.white),
            ),
            direction: DismissDirection.endToStart,
            onDismissed: (direction) {
              _removeTrustedIssuer(issuer);
            },
            child: ListTile(
              title: Text(issuer),
              trailing: IconButton(
                icon: Icon(Icons.delete),
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (BuildContext context) {
                      return AlertDialog(
                        title: Text("Remove Trusted Issuer"),
                        content: Text("Are you sure you want to remove this issuer?"),
                        actions: [
                          TextButton(
                            child: Text("Cancel"),
                            onPressed: () {
                              Navigator.of(context).pop();
                            },
                          ),
                          TextButton(
                            child: Text("Remove"),
                            onPressed: () {
                              Navigator.of(context).pop();
                              _removeTrustedIssuer(issuer);
                            },
                          ),
                        ],
                      );
                    },
                  );
                },
              ),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _navigateToAddTrustedIssuer,
        child: Icon(Icons.add),
        tooltip: 'Add Trusted Issuer',
      ),
    );
  }
}