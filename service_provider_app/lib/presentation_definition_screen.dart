// Import necessary Flutter material package for UI components
import 'package:flutter/material.dart';

// Import dart:convert for JSON encoding
import 'dart:convert';

/// A StatelessWidget that displays a Presentation Definition in a formatted manner.
///
/// This widget takes a Map representation of a Presentation Definition and
/// displays it as a formatted JSON string in a scrollable view.
class PresentationDefinitionScreen extends StatelessWidget {
  // The Presentation Definition to be displayed, stored as a Map
  final Map<String, dynamic> presentationDefinition;

  // Constructor for the PresentationDefinitionScreen
  // The presentationDefinition is required and passed as a parameter
  const PresentationDefinitionScreen({
    Key? key,
    required this.presentationDefinition
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // AppBar with the title "Presentation Definition"
      appBar: AppBar(
        title: Text('Presentation Definition'),
      ),
      // Body of the screen, wrapped in a SingleChildScrollView for scrollability
      body: SingleChildScrollView(
        // Add padding around the content
        padding: EdgeInsets.all(16),
        // Display the Presentation Definition as a formatted JSON string
        child: Text(
          // Convert the presentationDefinition Map to a formatted JSON string
          // The JsonEncoder.withIndent('  ') adds 2 spaces of indentation for readability
          const JsonEncoder.withIndent('  ').convert(presentationDefinition),
          // Use a monospaced font (Courier) for better formatting of the JSON
          style: TextStyle(fontFamily: 'Courier'),
        ),
      ),
    );
  }
}