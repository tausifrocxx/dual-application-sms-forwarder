# Android App Setup and Code Guide

## Step 1: Create Android Studio Project
- Open Android Studio.
- Click "New Project".
- Choose "Empty Activity".
- Name the project `MySmsForwarderApp`.
- Set language to Java.
- Set minimum SDK to API 21 or higher.
- Finish to create the project.

## Step 2: Folder and File Structure
Inside `app/src/main/java/com/example/smsforwarder/` create these files:
- `MainActivity.java` - Main activity (minimal UI).
- `SmsReceiver.java` - BroadcastReceiver to listen for incoming SMS.
- `BootReceiver.java` - BroadcastReceiver to auto-start app on device boot.
- `Utils.java` - Utility class for shared functions.

Inside `app/src/main/res/layout/`:
- `activity_main.xml` - Layout for MainActivity (can be minimal or blank).

Inside `app/src/main/res/values/`:
- `colors.xml` - Define BMW-style colors (black, blue, white gradients).
- `styles.xml` - Define app theme using colors.
- `strings.xml` - App strings.

## Step 3: AndroidManifest.xml
- Add permissions:
  - `RECEIVE_SMS`
  - `SEND_SMS`
  - `RECEIVE_BOOT_COMPLETED`
  - `INTERNET`
- Register `SmsReceiver` and `BootReceiver`.
- Set `MainActivity` as launcher but hide icon (stealth mode).

## Step 4: Code Overview

### MainActivity.java
- Minimal UI or blank.
- No launcher icon shown.

### SmsReceiver.java
- Listens for incoming SMS.
- Forwards SMS content and sender to admin number via SMS or API call.
- Runs silently in background.

### BootReceiver.java
- Listens for device boot.
- Starts background service or app logic to keep SMS forwarding active.

### Utils.java
- Helper methods for sending SMS, reading admin number from shared preferences or backend.

## Step 5: How to Paste Code
- Open each file in Android Studio.
- Replace existing content or create new files as per structure.
- Copy-paste the provided code snippets into respective files.
- Sync and build project.

## Step 6: Build and Test
- Connect physical Android device.
- Run app.
- Test SMS forwarding by sending SMS to device.
- Verify messages appear in admin panel.

---

This guide will be followed by detailed code files with comments.
