package com.example.smsforwarder;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.d(TAG, "Boot completed, starting service");
            
            // Start the main activity in hidden mode
            Intent mainIntent = new Intent(context, MainActivity.class);
            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            mainIntent.putExtra("start_hidden", true);
            
            // For Android 10 (API 29) and above, we need to handle background service differently
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Use WorkManager or other appropriate method for newer Android versions
                Utils.scheduleBackgroundWork(context);
            } else {
                // Start activity directly for older versions
                context.startActivity(mainIntent);
            }
            
            // Initialize SMS receiver if needed
            Utils.initializeSmsReceiver(context);
            
            Log.d(TAG, "Service startup completed");
        }
    }
}
