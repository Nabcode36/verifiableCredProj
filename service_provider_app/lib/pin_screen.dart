import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'home_page.dart';

/// A stateful widget that represents a PIN entry screen.
/// This screen can be used for setting up a new PIN, verifying an existing PIN,
/// or entering a PIN for access.
class PinScreen extends StatefulWidget {
  final bool isSetup;     // Indicates if the screen is used for PIN setup
  final bool isVerifying; // Indicates if the screen is used for PIN verification
  final Function? onSuccess; // Callback function to be called on successful verification

  PinScreen({
    Key? key,
    this.isSetup = false,
    this.isVerifying = false,
    this.onSuccess,
  }) : super(key: key);

  @override
  _PinScreenState createState() => _PinScreenState();
}

class _PinScreenState extends State<PinScreen> {
  String _pin = '';        // Stores the entered PIN
  String _confirmPin = ''; // Stores the confirmation PIN during setup
  String _error = '';      // Stores error messages

  /// Adds a digit to the PIN or confirmation PIN
  void _addDigit(String digit) {
    setState(() {
      if (widget.isSetup) {
        if (_pin.length < 4) {
          _pin += digit;
        } else if (_confirmPin.length < 4) {
          _confirmPin += digit;
        }
      } else {
        if (_pin.length < 4) {
          _pin += digit;
        }
      }
    });

    // Check if PIN entry is complete and perform appropriate action
    if (_pin.length == 4 && !widget.isSetup) {
      if (widget.isVerifying) {
        _verifyForReset();
      } else {
        _verifyPin();
      }
    } else if (_pin.length == 4 && _confirmPin.length == 4 && widget.isSetup) {
      _setupPin();
    }
  }

  /// Removes the last entered digit from the PIN or confirmation PIN
  void _removeDigit() {
    setState(() {
      if (widget.isSetup) {
        if (_confirmPin.isNotEmpty) {
          _confirmPin = _confirmPin.substring(0, _confirmPin.length - 1);
        } else if (_pin.isNotEmpty) {
          _pin = _pin.substring(0, _pin.length - 1);
        }
      } else {
        if (_pin.isNotEmpty) {
          _pin = _pin.substring(0, _pin.length - 1);
        }
      }
      _error = '';
    });
  }

  /// Sets up a new PIN
  Future<void> _setupPin() async {
    if (_pin == _confirmPin) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('pin', _pin);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => MyHomePage()),
      );
    } else {
      setState(() {
        _error = 'PINs do not match. Please try again.';
        _pin = '';
        _confirmPin = '';
      });
    }
  }

  /// Verifies the entered PIN against the stored PIN
  Future<void> _verifyPin() async {
    final prefs = await SharedPreferences.getInstance();
    final storedPin = prefs.getString('pin') ?? '';

    if (_pin == storedPin) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => MyHomePage()),
      );
    } else {
      setState(() {
        _error = 'Incorrect PIN. Please try again.';
        _pin = '';
      });
    }
  }

  /// Builds a single PIN dot widget
  Widget _buildPinDot(bool filled) {
    return Container(
      margin: EdgeInsets.all(8),
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: filled ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.onSurface,
      ),
    );
  }

  /// Verifies the PIN for reset purposes
  Future<void> _verifyForReset() async {
    final prefs = await SharedPreferences.getInstance();
    final storedPin = prefs.getString('pin') ?? '';

    if (_pin == storedPin) {
      if (widget.onSuccess != null) {
        widget.onSuccess!();
      }
    } else {
      setState(() {
        _error = 'Incorrect PIN. Please try again.';
        _pin = '';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isSetup
            ? 'Set up PIN'
            : (widget.isVerifying ? 'Verify PIN' : 'Enter PIN')),
      ),
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Spacer(flex: 2),
              Text(
                widget.isSetup
                    ? (_pin.length == 4 ? 'Confirm your PIN' : 'Enter a new PIN')
                    : (widget.isVerifying ? 'Enter your current PIN' : 'Enter your PIN'),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  4,
                      (index) => _buildPinDot(
                    widget.isSetup
                        ? (_pin.length == 4
                        ? index < _confirmPin.length
                        : index < _pin.length)
                        : index < _pin.length,
                  ),
                ),
              ),
              SizedBox(height: 20),
              Text(
                _error,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              SizedBox(height: 20),
              Expanded(
                flex: 3,
                child: GridView.count(
                  crossAxisCount: 3,
                  childAspectRatio: 1.5,
                  padding: EdgeInsets.all(20),
                  children: List.generate(12, (index) {
                    if (index == 9) {
                      return Container(); // Empty space for layout purposes
                    } else if (index == 10) {
                      return TextButton(
                        onPressed: () => _addDigit('0'),
                        child: Text('0', style: Theme.of(context).textTheme.headlineSmall),
                      );
                    } else if (index == 11) {
                      return IconButton(
                        onPressed: _removeDigit,
                        icon: Icon(Icons.backspace),
                      );
                    } else {
                      return TextButton(
                        onPressed: () => _addDigit((index + 1).toString()),
                        child: Text('${index + 1}', style: Theme.of(context).textTheme.headlineSmall),
                      );
                    }
                  }),
                ),
              ),
              Spacer(flex: 1),
            ],
          ),
        ),
      ),
    );
  }
}