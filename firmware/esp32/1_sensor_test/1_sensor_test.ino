/*
 * BMI Scanner — Step 1: Sensor test (no Firebase)
 *
 * Use this sketch FIRST to confirm wiring before connecting Firebase.
 *
 * Libraries (Arduino IDE → Sketch → Include Library → Manage Libraries):
 *   - HX711 Arduino Library by Bogdan Necula
 *   - (Ultrasonic uses built-in pulseIn — no extra library needed)
 *
 * Board: ESP32 Dev Module
 * Upload speed: 115200
 */

#include <HX711.h>

// -------- PIN CONFIG — change these to match your wiring --------
#define HX711_DOUT_PIN 16
#define HX711_SCK_PIN  17
#define ULTRASONIC_TRIG_PIN 5
#define ULTRASONIC_ECHO_PIN 18

// Distance from sensor to floor (cm) — measure and adjust during calibration
#define SENSOR_MOUNT_HEIGHT_CM 200.0

// HX711 calibration — start with 1.0, then adjust after placing a known weight
#define LOADCELL_SCALE 2280.0f
#define LOADCELL_OFFSET 0

HX711 scale;

float readHeightCm() {
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);

  long duration = pulseIn(ULTRASONIC_ECHO_PIN, HIGH, 30000);
  if (duration == 0) {
    return -1;
  }

  float distanceCm = duration * 0.0343f / 2.0f;
  float heightCm = SENSOR_MOUNT_HEIGHT_CM - distanceCm;
  return heightCm > 0 ? heightCm : 0;
}

float readWeightKg() {
  if (!scale.is_ready()) {
    return -1;
  }
  return scale.get_units(5);
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
  Serial.println("=== BMI Sensor Test ===");
  Serial.println("Place student on scale. Readings print every 2 seconds.");
  Serial.println("If weight is wrong, adjust LOADCELL_SCALE in the code.");
  Serial.println("If height is wrong, adjust SENSOR_MOUNT_HEIGHT_CM.");
  Serial.println();
}

void loop() {
  float height = readHeightCm();
  float weight = readWeightKg();

  Serial.print("Height (cm): ");
  Serial.println(height < 0 ? "ERROR" : String(height, 1));

  Serial.print("Weight (kg): ");
  Serial.println(weight < 0 ? "ERROR" : String(weight, 2));

  Serial.println("---");
  delay(2000);
}
