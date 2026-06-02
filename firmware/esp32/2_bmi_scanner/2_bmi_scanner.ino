/*
 * BMI Scanner — Step 2: Firebase + ESP32 (matches web app Device Sync)
 *
 * Protocol (Firestore document: devices/esp32):
 *   Web app writes:  { requestBMI: true }
 *   ESP32 writes:    { requestBMI: false, height: <cm>, weight: <kg> }
 *
 * Libraries (Arduino IDE → Manage Libraries):
 *   - Firebase ESP Client by Mobizt
 *   - HX711 Arduino Library by Bogdan Necula
 *
 * Also install ESP32 board support:
 *   File → Preferences → Additional Board URLs:
 *   https://espressif.github.io/arduino-esp32/package_esp32_index.json
 *   Then Tools → Board → Boards Manager → search "esp32" → Install
 *
 * Before uploading, fill in the CONFIG section below.
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <HX711.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ===================== CONFIG — EDIT THESE =====================

#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

#define FIREBASE_API_KEY "AIzaSyDyWSZpLanb_Mz9iJHi6nnIdugEYa_-dBU"
#define FIREBASE_PROJECT_ID "bmi-sys-5383d"

// Create this user in Firebase Console → Authentication → Users
#define DEVICE_EMAIL "esp32.device@bmi-sys.local"
#define DEVICE_PASSWORD "ChangeThisDevicePassword123!"

// Firestore path used by the web app
#define DEVICE_DOC_PATH "projects/bmi-sys-5383d/databases/(default)/documents/devices/esp32"

// -------- PIN CONFIG — change to match your wiring --------
#define HX711_DOUT_PIN 16
#define HX711_SCK_PIN  17
#define ULTRASONIC_TRIG_PIN 5
#define ULTRASONIC_ECHO_PIN 18

#define SENSOR_MOUNT_HEIGHT_CM 200.0
#define LOADCELL_SCALE 2280.0f

// ===============================================================

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
HX711 scale;

bool signupOK = false;
bool requestHandled = false;

void tokenStatusCallback(TokenInfo info) {
  if (info.status == token_status_error) {
    Serial.printf("Token error: %s\n", info.error.message.c_str());
  }
}

float readHeightCm() {
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);

  long duration = pulseIn(ULTRASONIC_ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;

  float distanceCm = duration * 0.0343f / 2.0f;
  float heightCm = SENSOR_MOUNT_HEIGHT_CM - distanceCm;
  return heightCm > 0 ? heightCm : 0;
}

float readWeightKg() {
  if (!scale.is_ready()) return -1;
  return scale.get_units(10);
}

bool getRequestBMI(bool &requestBMI) {
  if (!Firebase.Firestore.getDocument(&fbdo, "", "", DEVICE_DOC_PATH)) {
    Serial.printf("Firestore read failed: %s\n", fbdo.errorReason().c_str());
    return false;
  }

  FirebaseJson json;
  json.setJsonData(fbdo.payload());

  FirebaseJsonData data;
  if (json.get(data, "fields.requestBMI.booleanValue")) {
    requestBMI = data.boolValue;
    return true;
  }

  return false;
}

bool sendReadings(float height, float weight) {
  FirebaseJson content;
  FirebaseJson fields;
  FirebaseJson requestField;
  FirebaseJson heightField;
  FirebaseJson weightField;

  requestField.set("booleanValue", false);
  heightField.set("doubleValue", height);
  weightField.set("doubleValue", weight);

  fields.set("requestBMI", requestField);
  fields.set("height", heightField);
  fields.set("weight", weightField);
  content.set("fields", fields);

  String payload;
  content.toString(payload);

  if (!Firebase.Firestore.patchDocument(
        &fbdo,
        "",
        "",
        DEVICE_DOC_PATH,
        payload.c_str(),
        "requestBMI,height,weight")) {
    Serial.printf("Firestore write failed: %s\n", fbdo.errorReason().c_str());
    return false;
  }

  return true;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(ULTRASONIC_ECHO_PIN, INPUT);

  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  scale.set_scale(LOADCELL_SCALE);
  scale.tare();

  Serial.println();
  Serial.println("=== BMI Scanner (Firebase) ===");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  config.api_key = FIREBASE_API_KEY;
  config.token_status_callback = tokenStatusCallback;
  auth.user.email = DEVICE_EMAIL;
  auth.user.password = DEVICE_PASSWORD;

  config.timeout.serverResponse = 10 * 1000;

  Firebase.begin(&config, &auth);
  Firebase.reconnectNetwork(true);

  Serial.println("Firebase initialized. Waiting for scan requests...");
  Serial.println("In the web app: Device Sync → Start Scanning");
}

void loop() {
  if (Firebase.ready() && (signupOK || Firebase.signUp(&fbdo, "", "", "", ""))) {
    signupOK = Firebase.ready();
  }

  if (!signupOK) {
    delay(1000);
    return;
  }

  bool requestBMI = false;
  if (!getRequestBMI(requestBMI)) {
    delay(2000);
    return;
  }

  if (requestBMI && !requestHandled) {
    Serial.println("Scan requested — reading sensors...");

    float height = readHeightCm();
    float weight = readWeightKg();

    Serial.printf("Readings: height=%.1f cm, weight=%.2f kg\n", height, weight);

    if (height > 0 && weight > 0) {
      if (sendReadings(height, weight)) {
        Serial.println("Sent to Firebase successfully");
        requestHandled = true;
      }
    } else {
      Serial.println("Sensor error — check wiring");
    }
  }

  if (!requestBMI) {
    requestHandled = false;
  }

  delay(1000);
}
