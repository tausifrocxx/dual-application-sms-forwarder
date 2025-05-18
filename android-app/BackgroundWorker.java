package com.example.smsforwarder;

import android.content.Context;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class BackgroundWorker extends Worker {
    private static final String TAG = "BackgroundWorker";

    public BackgroundWorker(
        @NonNull Context context,
        @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            // Check if service is running
            Context context = getApplicationContext();
            
            // Ensure SMS receiver is initialized
            Utils.initializeSmsReceiver(context);
            
            // Check network connectivity
            if (!isNetworkAvailable(context)) {
                Log.w(TAG, "No network connection available");
                return Result.retry();
            }

            // Verify admin number is set
            String adminNumber = Utils.getAdminNumber(context);
            if (adminNumber == null || adminNumber.isEmpty()) {
                Log.w(TAG, "Admin number not set");
                return Result.failure();
            }

            // Send heartbeat to backend
            sendHeartbeat(context);

            Log.d(TAG, "Background work completed successfully");
            return Result.success();
        } catch (Exception e) {
            Log.e(TAG, "Error in background work: " + e.getMessage());
            return Result.failure();
        }
    }

    private boolean isNetworkAvailable(Context context) {
        try {
            android.net.ConnectivityManager cm = 
                (android.net.ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            android.net.NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
        } catch (Exception e) {
            Log.e(TAG, "Error checking network: " + e.getMessage());
            return false;
        }
    }

    private void sendHeartbeat(Context context) {
        try {
            // Create JSON payload
            org.json.JSONObject payload = new org.json.JSONObject();
            payload.put("deviceId", Utils.getDeviceId(context));
            payload.put("timestamp", System.currentTimeMillis());
            payload.put("type", "heartbeat");

            // Send to backend
            java.net.URL url = new java.net.URL("https://your-backend-url.com/api/heartbeat");
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            // Add API key if available
            String apiKey = Utils.getApiKey(context);
            if (apiKey != null && !apiKey.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            }

            // Send data
            try (java.io.OutputStream os = conn.getOutputStream()) {
                byte[] input = payload.toString().getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            // Check response
            int responseCode = conn.getResponseCode();
            Log.d(TAG, "Heartbeat response code: " + responseCode);

        } catch (Exception e) {
            Log.e(TAG, "Error sending heartbeat: " + e.getMessage());
        }
    }
}
