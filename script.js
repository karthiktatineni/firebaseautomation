import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// TODO: Replace with your actual Firebase project config credentials
const firebaseConfig = {
    // apiKey: "YOUR_API_KEY",
    // authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    // databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    // projectId: "YOUR_PROJECT_ID",
    // storageBucket: "YOUR_PROJECT_ID.appspot.com",
    // messagingSenderId: "YOUR_SENDER_ID",
    // appId: "YOUR_APP_ID"
};

const devices = ['relay1', 'relay2', 'relay3', 'relay4'];
let database;

// Update UI Function
function updateUI(deviceId, state) {
    const card = document.getElementById(`card-${deviceId}`);
    const statusText = document.getElementById(`status-${deviceId}`);
    const switchInput = document.getElementById(`switch-${deviceId}`);

    if (!card || !statusText || !switchInput) return;

    if (state === 'ON') {
        card.classList.add('active');
        statusText.textContent = 'ON';
        switchInput.checked = true;
    } else {
        card.classList.remove('active');
        statusText.textContent = 'OFF';
        switchInput.checked = false;
    }

    // Enable inputs once loaded
    switchInput.disabled = false;
}

// Initialise App
function init() {
    const isConfigured = Object.keys(firebaseConfig).length > 0;
    const indicator = document.querySelector('.status-indicator');

    if (isConfigured) {
        try {
            const app = initializeApp(firebaseConfig);
            database = getDatabase(app);

            indicator.classList.add('connected');
            indicator.innerHTML = '<span class="pulse"></span> Connected';

            // Realtime Firebase Listeners
            devices.forEach(device => {
                const deviceRef = ref(database, `devices/${device}/state`);
                onValue(deviceRef, (snapshot) => {
                    const state = snapshot.val();
                    if (state) {
                        updateUI(device, state);
                    } else {
                        // Default to OFF if missing in DB
                        updateUI(device, 'OFF');
                    }
                });
            });
        } catch (e) {
            console.error("Firebase setup failed:", e);
            alert("Firebase setup failed. Check console.");
        }
    } else {
        console.warn("Firebase not configured. Running in Mock Mode.");
        indicator.innerHTML = '<span class="pulse" style="background:#64748b; animation:none; box-shadow:none;"></span> Mock Mode';

        // Mock Mode Fallback
        devices.forEach(device => updateUI(device, 'OFF'));
    }

    // Attach Event Listeners to Switches
    devices.forEach(device => {
        const switchInput = document.getElementById(`switch-${device}`);
        if (switchInput) {
            switchInput.addEventListener('change', (e) => handleToggle(device, e.target.checked));
        }
    });
}

function handleToggle(deviceId, isChecked) {
    const newState = isChecked ? 'ON' : 'OFF';

    // Optional haptic feedback for mobile
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }

    if (database) {
        // Optimistic UI update (update immediately for snappy feel)
        updateUI(deviceId, newState);

        // Push to Firebase Realtime Database
        const deviceRef = ref(database, `devices/${deviceId}/state`);
        set(deviceRef, newState).catch(error => {
            console.error(`Failed to update ${deviceId}:`, error);
            // Revert state on failure
            updateUI(deviceId, isChecked ? 'OFF' : 'ON');
            alert('Failed to connect to Firebase server.');
        });
    } else {
        // Update in mock mode
        updateUI(deviceId, newState);
    }
}

// Start application
document.addEventListener('DOMContentLoaded', init);
