# Stealth Forwarder - Flutter Application Testing Plan

## 1. Introduction

This document outlines the testing strategy for the `stealth_forwarder` Flutter application. The application is designed to run as a background service, listen for incoming SMS messages, and forward them to a specified admin phone number via an API. Due to its background nature and reliance on system permissions and external APIs, testing will involve a combination of conceptual unit tests and manual integration tests.

## 2. Conceptual Unit Tests (Automated)

These tests would be written using `flutter_test` and mocking frameworks (like `mockito`) to isolate components.

### 2.1. `fetchAdminNumber()`

**Objective:** Verify the logic for fetching the admin phone number from the backend API.

**Dependencies to Mock:** `http.Client`

**Test Cases:**

1.  **Success Case:**
    *   **Description:** API returns a 200 OK with valid JSON `{"adminNumber": "1234567890"}`.
    *   **Expected:** `currentAdminNumber` is updated, success is logged, no retries.
2.  **API Error (e.g., 500 Internal Server Error):**
    *   **Description:** API returns a non-200 status code.
    *   **Expected:** Error is logged, retry logic is triggered (3 attempts), `currentAdminNumber` remains null/unchanged if all retries fail.
3.  **Network Error (e.g., `SocketException`):**
    *   **Description:** `http.get` throws a `SocketException`.
    *   **Expected:** Network error is logged, retry logic is triggered (3 attempts), `currentAdminNumber` remains null/unchanged if all retries fail.
4.  **Malformed JSON Response:**
    *   **Description:** API returns 200 OK but with invalid JSON (e.g., `{"wrongKey": "123"}` or `not_json`).
    *   **Expected:** JSON parsing error (`FormatException`) is logged, retry logic is triggered, `currentAdminNumber` remains null/unchanged if all retries fail.
5.  **Retry Logic Exhaustion:**
    *   **Description:** API consistently fails (e.g., returns 500) for all 3 retry attempts.
    *   **Expected:** Appropriate error logged after each attempt, final failure logged, `currentAdminNumber` remains null.
6.  **Retry Logic Success on Nth Attempt:**
    *   **Description:** API fails for the first 1-2 attempts but succeeds on a subsequent attempt.
    *   **Expected:** Errors logged for failed attempts, success logged on successful attempt, `currentAdminNumber` is updated.

### 2.2. `forwardSmsViaApi()`

**Objective:** Verify the logic for forwarding SMS details to the backend API.

**Dependencies to Mock:** `http.Client`

**Test Cases:**

1.  **Success Case:**
    *   **Description:** `currentAdminNumber` is set, API returns 200 OK or 201 Created.
    *   **Expected:** API is called with correct payload (sender, body, timestamp, adminNumber) and headers (Content-Type, X-API-Key), success is logged.
2.  **API Error (e.g., 400 Bad Request, 500 Internal Server Error):**
    *   **Description:** `currentAdminNumber` is set, API returns a non-200/201 status code.
    *   **Expected:** Error is logged (including status code and response body).
3.  **Network Error (e.g., `SocketException`):**
    *   **Description:** `currentAdminNumber` is set, `http.post` throws a `SocketException`.
    *   **Expected:** Network error is logged.
4.  **Missing Admin Number:**
    *   **Description:** `currentAdminNumber` is `null`.
    *   **Expected:** Function logs an error and returns immediately without attempting an API call.

### 2.3. Other Potential Unit Tests

*   **Data Parsing/Transformation:** If there were more complex data transformations (e.g., parsing different SMS formats, complex JSON structures), those would be prime candidates for unit tests. (Minimal in this app).
*   **Permission Handling Logic (if more complex):** If `initializeSmsListener` had more intricate logic around permission states beyond a simple check, that could be unit tested by mocking `Permission.sms.status`.

## 3. Integration Testing Plan (Manual Execution)

These tests require a running backend, a configured APK installed on an Android device/emulator, and manual steps.

### 3.1. Prerequisites

*   **Live Backend:** The admin number API (`/api/getAdminNumber`) and SMS forwarding API (`/api/forwardSms`) must be deployed and accessible.
*   **Configured APK:** A release build of the `stealth_forwarder` APK with correct API URLs and API key.
*   **Android Device/Emulator:** Android 8.0 (Oreo) or higher recommended.
*   **`adb` (Android Debug Bridge):** Installed and configured for logcat access.
*   **SMS Sending Capability:** A way to send SMS messages to the test device.

### 3.2. Test Cases

**Monitoring Tool:** Use `adb logcat` throughout testing. Recommended filters:
*   `adb logcat -s Flutter TAG:SMFS_Service`
*   `adb logcat "*:S" Flutter:V SMFS_Service:V` (shows only Flutter and our service logs)

**Test Case 1: Installation and Initial Run**

*   **Steps:**
    1.  Install the APK on the test device.
    2.  Verify that no application icon is visible in the launcher.
    3.  Manually navigate to App Info -> Permissions and grant "SMS" permission.
    4.  Open a non-related app or go to the home screen.
*   **Expected Outcome:**
    *   Via `adb logcat`:
        *   `[SMFS_Service] onStart: Background Service Started.`
        *   `[SMFS_Service] fetchAdminNumber: ... Admin number fetched successfully: <admin_number>` (or retry attempts if backend is initially problematic).
        *   `[SMFS_Service] initializeSmsListener: SMS Permission Status: PermissionStatus.granted`
        *   `[SMFS_Service] initializeSmsListener: SMS listener successfully set up.`
        *   Foreground service notification is visible in the system tray.
    *   Backend: Verify no SMS forwarding calls yet.

**Test Case 2: SMS Forwarding (App in Foreground/Background)**

*   **Steps:**
    1.  Ensure Test Case 1 is complete and the service is running with an admin number.
    2.  Send an SMS to the test device.
    3.  (Optional) Open any app on the device to ensure `stealth_forwarder` is in the background.
*   **Expected Outcome:**
    *   Via `adb logcat`:
        *   `[SMFS_Service] initializeSmsListener (onNewMessage): Incoming SMS from: <sender_number>, Body: <sms_body>, ...`
        *   `[SMFS_Service] forwardSmsViaApi: Attempting to forward SMS...`
        *   `[SMFS_Service] forwardSmsViaApi: SMS from <sender_number> forwarded successfully. Status: 200` (or 201).
    *   Backend: Verify the SMS details (sender, body, timestamp, adminNumber) are received and stored correctly by the forwarding API.

**Test Case 3: Auto-Start on Device Boot**

*   **Steps:**
    1.  Ensure Test Case 1 is complete.
    2.  Reboot the test device.
    3.  Wait a few minutes for the system to settle and services to start.
    4.  Send an SMS to the test device.
*   **Expected Outcome:**
    *   Via `adb logcat` (after reboot, might need to reconnect `adb`):
        *   `[SMFS_Service] onStart: Background Service Started.` (indicating service auto-started).
        *   Logs indicating admin number fetch and SMS listener setup.
        *   Foreground service notification is visible.
        *   When SMS is received: Logs similar to Test Case 2 for SMS reception and forwarding.
    *   Backend: Verify the SMS is forwarded correctly after reboot.

**Test Case 4: Error Handling - Admin Number Fetch Failure**

*   **Steps:**
    1.  Temporarily make the `/api/getAdminNumber` API endpoint unreachable or return an error (e.g., 500).
    2.  Install and run the app (or clear app data and restart if already installed).
*   **Expected Outcome:**
    *   Via `adb logcat`:
        *   `[SMFS_Service] fetchAdminNumber: Attempt 1... Error - API request failed...` (or network error).
        *   Retry attempts logged (up to 3 times).
        *   `[SMFS_Service] fetchAdminNumber: Failed to fetch admin number after 3 attempts.`
        *   `[SMFS_Service] onStart: Failed to obtain admin number. SMS forwarding will not be initialized.`
    *   Send an SMS to the device.
    *   Via `adb logcat`: `initializeSmsListener` might still set up the listener if SMS permission is granted, but `forwardSmsViaApi` calls (if any were to happen) should log "Admin number is not available". No forwarding API call should be made.
    *   Backend: No SMS forwarding calls.

**Test Case 5: Error Handling - SMS Forwarding Failure**

*   **Steps:**
    1.  Ensure admin number is fetched successfully.
    2.  Temporarily make the `/api/forwardSms` API endpoint unreachable or return an error.
    3.  Send an SMS to the test device.
*   **Expected Outcome:**
    *   Via `adb logcat`:
        *   SMS reception logged by `initializeSmsListener (onNewMessage)`.
        *   `[SMFS_Service] forwardSmsViaApi: Attempting to forward SMS...`
        *   `[SMFS_Service] forwardSmsViaApi: Error forwarding SMS... Status: <error_code>...` (or network error).
    *   Backend: No (or failed) SMS forwarding calls.

**Test Case 6: No SMS Permission**

*   **Steps:**
    1.  Install the app.
    2.  Go to App Info -> Permissions and explicitly Deny (or Revoke if already granted) the "SMS" permission.
    3.  Restart the app/service (e.g., by rebooting or clearing data and letting it start).
    4.  Send an SMS to the test device.
*   **Expected Outcome:**
    *   Via `adb logcat`:
        *   `[SMFS_Service] initializeSmsListener: SMS Permission Status: PermissionStatus.denied` (or .permanentlyDenied).
        *   `[SMFS_Service] initializeSmsListener: SMS permission not granted. Listener will not be started.`
    *   No logs indicating SMS reception by the app's listener.
    *   No calls to `forwardSmsViaApi`.
    *   Backend: No SMS forwarding calls.

**Test Case 7: Long-Running Stability Test**

*   **Steps:**
    1.  Set up the application correctly (permissions granted, APIs working).
    2.  Leave the application running on a device for an extended period (e.g., 24-48 hours).
    3.  Periodically send SMS messages.
    4.  Monitor device battery usage (ensure it's not excessively draining battery).
    5.  Check logs for any unexpected errors, crashes, or service stops.
*   **Expected Outcome:**
    *   Service remains running without crashes.
    *   SMS messages are consistently forwarded.
    *   No excessive battery drain attributable to the app.
    *   Logs remain clean of unexpected errors. The periodic timer log `Background Service is running...` should appear regularly.

## 4. Test Environment

*   **Operating System:** Android 8.0 (Oreo) and above.
*   **Flutter Version:** (Specify version used for build, e.g., Flutter 3.x.x)
*   **Key Plugins:**
    *   `flutter_background_service`
    *   `telephony_plus`
    *   `http`
    *   `permission_handler`
*   **Backend API:** Provide details or link to documentation for the test backend.

## 5. Reporting

*   Test results will be documented, noting any deviations from expected outcomes.
*   Log snippets (`adb logcat`) should be included for failed test cases or unexpected behavior.
*   Bugs will be reported in a designated issue tracker with steps to reproduce, expected vs. actual results, and relevant logs.
