// Import necessary Flutter packages
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'dart:convert';

/// A screen widget for adding fields based on Schema.org data
class AddFieldScreen extends StatefulWidget {
  /// Callback function to be called when a field is added
  final Function(Map<String, String>) onFieldAdded;

  AddFieldScreen({required this.onFieldAdded});

  @override
  _AddFieldScreenState createState() => _AddFieldScreenState();
}

class _AddFieldScreenState extends State<AddFieldScreen> with SingleTickerProviderStateMixin {
  // List to store the loaded JSON data from Schema.org
  List<Map<String, dynamic>> _jsonData = [];

  // List to store the selected subjects (fields) by the user
  List<Map<String, dynamic>> _selectedSubjects = [];

  // Controllers for text input fields
  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _regexController = TextEditingController();

  // Index of the currently expanded subject in the list
  int? _expandedIndex;

  // Controller for managing tabs
  late TabController _tabController;

  // Controller for managing scrolling
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadJsonData();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _regexController.dispose();
    _tabController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  /// Loads the Schema.org JSON data from the assets
  Future<void> _loadJsonData() async {
    try {
      String jsonString = await rootBundle.loadString('assets/schemaorg-current-http.jsonld');
      final jsonData = json.decode(jsonString);
      if (jsonData.containsKey('@graph') && jsonData['@graph'] is List) {
        setState(() {
          _jsonData = List<Map<String, dynamic>>.from(jsonData['@graph']);
        });
      } else {
        throw Exception('Invalid JSON structure');
      }
    } catch (e) {
      print('Error loading JSON data: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading data. Please try again later.')),
      );
    }
  }

  /// Returns a list of subject suggestions based on the user's input
  List<String> _getSubjectSuggestions(String query) {
    return _jsonData
        .where((item) => item['@type'] == 'rdfs:Class')
        .map((item) => item['rdfs:label'].toString())
        .where((label) => label.toLowerCase().contains(query.toLowerCase()))
        .take(5)
        .toList();
  }

  /// Adds a new subject to the list of selected subjects
  void _addSubject(String subject) {
    if (subject.isNotEmpty && !_selectedSubjects.any((item) => item['rdfs:label'] == subject)) {
      var subjectData = _jsonData.firstWhere(
            (item) => item['rdfs:label'] == subject && item['@type'] == 'rdfs:Class',
        orElse: () => {'rdfs:label': subject},
      );
      setState(() {
        _selectedSubjects.add(subjectData);
        _subjectController.clear();
        _expandedIndex = _selectedSubjects.length - 1;
      });
    }
  }

  /// Removes a subject from the list of selected subjects
  void _removeSubject(int index) {
    setState(() {
      _selectedSubjects.removeRange(index, _selectedSubjects.length);
      _expandedIndex = null;
    });
  }

  /// Retrieves relevant parameters for a given subject, including inherited parameters
  List<Map<String, dynamic>> _getRelevantParameters(Map<String, dynamic> subject) {
    List<Map<String, dynamic>> hierarchicalParams = [];

    void _getParamsRecursively(Map<String, dynamic> currentSubject, int depth) {
      String? subjectId = currentSubject['@id'];
      if (subjectId == null) return;

      var params = _jsonData.where((item) {
        if (item['schema:domainIncludes'] == null) return false;
        if (item['schema:domainIncludes'] is List) {
          return item['schema:domainIncludes'].any((domain) => domain is Map && domain['@id'] == subjectId);
        } else if (item['schema:domainIncludes'] is Map) {
          return item['schema:domainIncludes']['@id'] == subjectId;
        }
        return false;
      }).toList();

      if (params.isNotEmpty) {
        // Sort params alphabetically
        params.sort((a, b) => _getLabelString(a['rdfs:label']).compareTo(_getLabelString(b['rdfs:label'])));

        hierarchicalParams.add({
          'subject': currentSubject,
          'depth': depth,
          'params': params,
        });
      }

      // Check for rdfs:subClassOf to include inherited parameters
      if (currentSubject['rdfs:subClassOf'] != null) {
        var subClassOf = currentSubject['rdfs:subClassOf'];
        if (subClassOf is List) {
          for (var subClass in subClassOf) {
            if (subClass is Map && subClass.containsKey('@id')) {
              var parentSubject = _jsonData.firstWhere(
                    (item) => item['@id'] == subClass['@id'],
                orElse: () => {},
              );
              if (parentSubject.isNotEmpty) {
                _getParamsRecursively(parentSubject, depth + 1);
              }
            }
          }
        } else if (subClassOf is Map && subClassOf.containsKey('@id')) {
          var parentSubject = _jsonData.firstWhere(
                (item) => item['@id'] == subClassOf['@id'],
            orElse: () => {},
          );
          if (parentSubject.isNotEmpty) {
            _getParamsRecursively(parentSubject, depth + 1);
          }
        }
      }
    }

    _getParamsRecursively(subject, 0);

    return hierarchicalParams;
  }

  /// Handles the selection of a parameter for a subject
  void _selectParameter(int subjectIndex, Map<String, dynamic> parameter) async {
    var rangeIncludes = parameter['schema:rangeIncludes'];
    List<String> rangeLabels = [];

    if (rangeIncludes is List) {
      rangeLabels = rangeIncludes
          .map((range) => _getLabelFromId(range['@id']))
          .where((label) => label != null)
          .cast<String>()
          .toList();
    } else if (rangeIncludes is Map) {
      var label = _getLabelFromId(rangeIncludes['@id']);
      if (label != null) rangeLabels.add(label);
    }

    if (rangeLabels.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No valid options available for this parameter.')),
      );
      return;
    }

    String? selectedLabel;
    if (rangeLabels.length == 1) {
      selectedLabel = rangeLabels.first;
    } else {
      selectedLabel = await showDialog<String>(
        context: context,
        builder: (BuildContext context) {
          return SimpleDialog(
            title: Text('Select a type'),
            children: rangeLabels.map((String label) {
              return SimpleDialogOption(
                onPressed: () {
                  Navigator.pop(context, label);
                },
                child: Text(label),
              );
            }).toList(),
          );
        },
      );
    }

    if (selectedLabel != null) {
      setState(() {
        var newSubject = _jsonData.firstWhere(
              (item) => item['rdfs:label'] == selectedLabel && item['@type'] == 'rdfs:Class',
          orElse: () => {'rdfs:label': selectedLabel},
        );
        newSubject['selectedAttribute'] = parameter;
        _selectedSubjects.removeRange(subjectIndex + 1, _selectedSubjects.length);
        _selectedSubjects.add(newSubject);
        _expandedIndex = _selectedSubjects.length - 1;
      });

      // Scroll to the top after adding the attribute
      _scrollController.animateTo(
        0,
        duration: Duration(milliseconds: 500),
        curve: Curves.easeOut,
      );
    }
  }

  /// Retrieves the label for a given ID from the JSON data
  String? _getLabelFromId(String? id) {
    if (id == null) return null;
    var item = _jsonData.firstWhere((item) => item['@id'] == id, orElse: () => {});
    return _getLabelString(item['rdfs:label']);
  }

  /// Submits the selected fields and regex filter
  void _submitFields() {
    List<String> properties = _selectedSubjects
        .where((subject) => subject['selectedAttribute'] != null)
        .map((subject) => subject['selectedAttribute']['rdfs:label'].toString())
        .toList();

    String pathString = '\$.credentialSubject.' + properties.join('.');
    String filterString = _regexController.text;

    Map<String, String> fieldData = {
      'path': pathString,
      'filter': filterString,
    };

    widget.onFieldAdded(fieldData);
    Navigator.of(context).pop();
  }

  /// Retrieves the label of the parent subject for a given parameter
  String? _getParentSubjectLabel(Map<String, dynamic> param) {
    if (param['schema:domainIncludes'] is List) {
      return (param['schema:domainIncludes'] as List)
          .where((domain) => domain is Map && domain.containsKey('@id'))
          .map((domain) => _getLabelFromId(domain['@id']))
          .where((label) => label != null)
          .join(', ');
    } else if (param['schema:domainIncludes'] is Map) {
      return _getLabelFromId(param['schema:domainIncludes']['@id']);
    }
    return null;
  }

  /// Helper function to get a string representation of a label
  String _getLabelString(dynamic label) {
    if (label is String) {
      return label;
    } else if (label is Map) {
      return label['@value'] ?? 'Unknown Parameter';
    } else {
      return 'Unknown Parameter';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Add Fields'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'Attribute'),
            Tab(text: 'Filter'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Attribute Tab
          Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Autocomplete<String>(
                  optionsBuilder: (TextEditingValue textEditingValue) {
                    if (textEditingValue.text == '') {
                      return const Iterable<String>.empty();
                    }
                    return _getSubjectSuggestions(textEditingValue.text);
                  },
                  onSelected: (String selection) {
                    _addSubject(selection);
                  },
                  fieldViewBuilder: (BuildContext context, TextEditingController textEditingController, FocusNode focusNode, VoidCallback onFieldSubmitted) {
                    return TextField(
                      controller: textEditingController..text = "Person",
                      focusNode: focusNode,
                      decoration: InputDecoration(
                        labelText: 'Credential Subject',
                        border: OutlineInputBorder(),
                        suffixIcon: IconButton(
                          icon: Icon(Icons.add),
                          onPressed: () => _addSubject(textEditingController.text),
                        ),
                      ),
                    );
                  },
                ),
              ),
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  itemCount: _selectedSubjects.length,
                  itemBuilder: (context, index) {
                    var subject = _selectedSubjects[index];
                    var hierarchicalParams = _getRelevantParameters(subject);
                    bool isExpanded = _expandedIndex == index;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ListTile(
                          title: Text(
                            _getLabelString(subject['rdfs:label']),
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: subject['selectedAttribute'] != null
                              ? Text(
                            _getLabelString(subject['selectedAttribute']['rdfs:label']),
                            style: TextStyle(fontSize: 12),
                          )
                              : null,
                          trailing: Icon(isExpanded ? Icons.expand_less : Icons.expand_more),
                          onTap: () {
                            setState(() {
                              _expandedIndex = isExpanded ? null : index;
                            });
                          },
                        ),
                        if (isExpanded)
                          Padding(
                            padding: const EdgeInsets.only(left: 16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                ListTile(
                                  leading: Icon(Icons.delete, color: Colors.red),
                                  title: Text('Remove'),
                                  onTap: () => _removeSubject(index),
                                ),
                                LayoutBuilder(
                                  builder: (BuildContext context, BoxConstraints constraints) {
                                    return ConstrainedBox(
                                      constraints: BoxConstraints(
                                        minHeight: 50.0,
                                        maxHeight: constraints.maxHeight,
                                      ),
                                      child: ListView(
                                        shrinkWrap: true,
                                        physics: ClampingScrollPhysics(),
                                        children: hierarchicalParams.expand<Widget>((group) {
                                          List<Widget> groupWidgets = [
                                            Padding(
                                              padding: EdgeInsets.all(8.0),
                                              child: Text(
                                                _getLabelString(group['subject']['rdfs:label']),
                                                style: TextStyle(fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                          ];

                                          groupWidgets.addAll(
                                              (group['params'] as List).map<Widget>((param) =>
                                                  ListTile(
                                                    leading: Icon(Icons.add, color: Colors.green),
                                                    title: Text(_getLabelString(param['rdfs:label'])),
                                                    onTap: () => _selectParameter(index, param),
                                                  )
                                              )
                                          );

                                          return groupWidgets;
                                        }).toList(),
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
          // Filter Tab
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Regex Filter',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 8),
                TextField(
                  controller: _regexController,
                  decoration: InputDecoration(
                    labelText: 'Enter regex',
                    border: OutlineInputBorder(),
                    hintText: "e.g. ^[a-zA-Z0-9]+\$",
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _submitFields,
        child: Icon(Icons.check),
        tooltip: 'Submit Fields',
      ),
    );
  }
}