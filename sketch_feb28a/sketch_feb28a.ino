#include <WiFi.h>
#include <time.h>
#include <Firebase_ESP_Client.h>
#include <EEPROM.h>

// ===================== WIFI =====================
#define WIFI_SSID     "SwapnaHome"
#define WIFI_PASSWORD "NoPassword$2022"

// ===================== FIREBASE =====================
#define API_KEY       "AIzaSyC9DPirMZj1My_ArmvbJvrwxBhlDzlLslM"
#define DATABASE_URL  "https://home-7d635-default-rtdb.firebaseio.com/"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ===================== PINS =====================
const int relayPins[4]  = {5, 18, 19, 22};
const int switchPins[4] = {33, 32, 13, 12};
const int wifiLed = 2;

// ✅ Match your Firebase keys
const char* paths[4] = {
  "/devices/fan/state",
  "/devices/light1/state",
  "/devices/light2/state",
  "/devices/plug/state"
};

// ===================== RELAY TYPE =====================
// ACTIVE LOW relay board
static const bool RELAY_ACTIVE_HIGH = false;
#define RELAY_ON_LEVEL  (RELAY_ACTIVE_HIGH ? HIGH : LOW)
#define RELAY_OFF_LEVEL (RELAY_ACTIVE_HIGH ? LOW  : HIGH)

// ===================== EEPROM =====================
#define EEPROM_SIZE 4

// ===================== STATE =====================
bool relayState[4] = {false, false, false, false};

// For switch debounce + stable state
bool lastSwitchReading[4];
bool stableSwitchState[4];
unsigned long lastDebounceTime[4];
const unsigned long debounceMs = 60;

unsigned long lastPoll = 0;
const unsigned long pollMs = 250;

bool parseState(String s) {
  s.trim(); s.toUpperCase();
  return (s == "ON" || s == "TRUE" || s == "1");
}
const char* stateToString(bool on) { return on ? "ON" : "OFF"; }

void applyRelay(int i, bool on) {
  relayState[i] = on;
  digitalWrite(relayPins[i], on ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
}

void saveRelayToEEPROM(int i, bool on) {
  EEPROM.write(i, on ? 1 : 0);
  EEPROM.commit();
}

void syncTimeWithNTP() {
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov", "time.google.com");
  Serial.print("Syncing time");
  time_t now = time(nullptr);
  int tries = 0;

  while (now < 1700000000 && tries < 40) {
    Serial.print(".");
    delay(250);
    now = time(nullptr);
    tries++;
  }
  Serial.println();

  if (now < 1700000000) {
    Serial.println("❌ Time sync failed (TLS may fail)");
  } else {
    struct tm timeinfo;
    gmtime_r(&now, &timeinfo);
    Serial.printf("✅ Time OK (UTC): %04d-%02d-%02d %02d:%02d:%02d\n",
                  timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                  timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
  }
}

bool firebaseWriteState(int i, bool on) {
  if (!Firebase.RTDB.setString(&fbdo, paths[i], stateToString(on))) {
    Serial.print("Firebase write failed: ");
    Serial.println(fbdo.errorReason());
    return false;
  }
  return true;
}

bool firebaseReadState(int i, bool &onOut) {
  if (!Firebase.RTDB.getString(&fbdo, paths[i])) {
    Serial.print("Firebase read failed ");
    Serial.print(paths[i]);
    Serial.print(" : ");
    Serial.println(fbdo.errorReason());
    return false;
  }
  onOut = parseState(fbdo.stringData());
  return true;
}

void setup() {
  Serial.begin(115200);
  EEPROM.begin(EEPROM_SIZE);

  pinMode(wifiLed, OUTPUT);
  digitalWrite(wifiLed, LOW);

  // GPIO init
  for (int i = 0; i < 4; i++) {
    pinMode(relayPins[i], OUTPUT);

    // Load saved relay state
    int saved = EEPROM.read(i);
    if (saved != 0 && saved != 1) saved = 0;
    applyRelay(i, saved == 1);

    // Switch input
    pinMode(switchPins[i], INPUT_PULLUP);

    // Init debounce trackers
    bool r = digitalRead(switchPins[i]);
    lastSwitchReading[i] = r;
    stableSwitchState[i] = r;
    lastDebounceTime[i] = millis();
  }

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    digitalWrite(wifiLed, !digitalRead(wifiLed));
    delay(200);
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  digitalWrite(wifiLed, HIGH);

  // TLS time fix
  syncTimeWithNTP();

  // Firebase init
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Try anonymous signup (if enabled). If not, continue anyway (works with open RTDB rules)
  if (!Firebase.signUp(&config, &auth, "", "")) {
    Serial.print("Firebase signUp failed (continuing): ");
    Serial.println(config.signer.signupError.message.c_str());
  } else {
    Serial.println("Firebase signUp OK");
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  unsigned long t0 = millis();
  while (!Firebase.ready() && millis() - t0 < 15000) delay(100);
  Serial.println(Firebase.ready() ? "Firebase ready ✅" : "Firebase NOT ready ❌");
}

void loop() {
  digitalWrite(wifiLed, WiFi.status() == WL_CONNECTED ? HIGH : LOW);

  // ===================== 1) PHYSICAL SWITCHES (LATCHING WORKING) =====================
  // Switch ON  => GPIO LOW  => Relay ON
  // Switch OFF => GPIO HIGH => Relay OFF
  for (int i = 0; i < 4; i++) {
    bool reading = digitalRead(switchPins[i]);

    if (reading != lastSwitchReading[i]) {
      lastDebounceTime[i] = millis();
      lastSwitchReading[i] = reading;
    }

    if ((millis() - lastDebounceTime[i]) > debounceMs) {
      // stable state changed
      if (reading != stableSwitchState[i]) {
        stableSwitchState[i] = reading;

        bool desired = (stableSwitchState[i] == LOW); // LOW means switch ON
        if (desired != relayState[i]) {
          applyRelay(i, desired);
          saveRelayToEEPROM(i, desired);
          Serial.printf("Switch position -> Relay%d %s\n", i + 1, stateToString(desired));

          if (Firebase.ready()) firebaseWriteState(i, desired);
        }
      }
    }
  }

  // ===================== 2) CLOUD CONTROL (WEB/ALEXA -> RELAYS) =====================
  // This lets cloud change relay even if switch didn't move.
  // If your switches are real wall switches and you want them to ALWAYS override cloud,
  // tell me and I’ll lock cloud updates when switch is OFF/ON.
  if (Firebase.ready() && (millis() - lastPoll >= pollMs)) {
    lastPoll = millis();
    for (int i = 0; i < 4; i++) {
      bool cloudOn;
      if (firebaseReadState(i, cloudOn)) {
        if (cloudOn != relayState[i]) {
          applyRelay(i, cloudOn);
          saveRelayToEEPROM(i, cloudOn);
          Serial.printf("Cloud -> Relay%d %s\n", i + 1, stateToString(cloudOn));
        }
      }
    }
  }

  delay(5);
}