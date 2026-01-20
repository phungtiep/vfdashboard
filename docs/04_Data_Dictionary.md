# VinFast Telemetry Data Dictionary

**Version:** 1.0
**Status:** VALIDATED
**Context:** This document details the specific telemetry data points mapped from the VinFast Connected Car API to the Dashboard.

---

## 1. Key Telemetry Data Dictionary

**Dashboard Data Map**: Specific metrics required for the UI, validated on VF9.

### 1.1 Battery & Charging

| Metric                   | Alias Key                                 | Object ID | Inst | Rsrc | Sample Value | Description                           |
| :----------------------- | :---------------------------------------- | :-------- | :--- | :--- | :----------- | :------------------------------------ |
| **HV Battery Level**     | `VEHICLE_STATUS_HV_BATTERY_SOC`           | `34183`   | `1`  | `9`  | `63` (%)     | High Voltage Battery State of Charge  |
| **Range Estimate**       | `VEHICLE_STATUS_REMAINING_DISTANCE`       | `34183`   | `1`  | `11` | `364` (km)   | Estimated driving range               |
| **Battery Health (SOH)** | `BMS_STATUS_STATE_OF_HEALTH`              | `34220`   | `1`  | `1`  | `96` (%)     | Battery State of Health               |
| **Time to Full**         | `CHARGING_STATUS_CHARGING_REMAINING_TIME` | `34193`   | `1`  | `7`  | `201` (mins) | Minutes remaining to reach target SOC |
| **Target SOC**           | `CHARGE_CONTROL_CURRENT_TARGET_SOC`       | `34193`   | `1`  | `19` | `100` (%)    | User-set charging limit               |

### 1.2 Vehicle Status

| Metric       | Object ID | Inst | Rsrc | Sample Value     | Description                        |
| :----------- | :-------- | :--- | :--- | :--------------- | :--------------------------------- |
| **Odometer** | `34183`   | `1`  | `3`  | `43177.297` (km) | Total distance traveled            |
| **Gear**     | `34183`   | `1`  | `1`  | `P`              | Current Gear Position (P, R, N, D) |
| **Speed**    | `34183`   | `1`  | `2`  | `0` (km/h)       | Current Vehicle Speed              |
| **Ignition** | `34183`   | `1`  | `58` | `1` (On)         | Ignition status (0=Off, 1=On)      |

### 1.3 Tires (TPMS)

**Base Object ID**: `34183`

| Position        | Pressure Resource ID | Temp Resource ID | Notes                                       |
| :-------------- | :------------------- | :--------------- | :------------------------------------------ |
| **Front Left**  | `16`                 | `20`             | Pressure in Bar/kPa (check unit), Temp in C |
| **Front Right** | `17`                 | `21`             |                                             |
| **Rear Left**   | `18`                 | `22`             |                                             |
| **Rear Right**  | `19`                 | `23`             |                                             |

### 1.4 Location & GPS

**Base Object ID**: `6` (Instance `1`)

| Metric         | Alias Key                 | Resource ID | Description                    |
| :------------- | :------------------------ | :---------- | :----------------------------- |
| **Latitude**   | `LOCATION_LATITUDE`       | `0`         | GPS Latitude                   |
| **Longitude**  | `LOCATION_LONGITUDE`      | `1`         | GPS Longitude                  |
| **Heading**    | `LOCATION_BEARING_DEGREE` | `11`        | Heading in degrees (0 = North) |
| **GPS Status** | `LOCATION_GNSS_STATUS`    | `10`        | Signal quality/fix status      |

### 1.5 Climate & Environment

| Metric           | Alias Key                             | Path          | Description                   |
| :--------------- | :------------------------------------ | :------------ | :---------------------------- |
| **Outside Temp** | `VEHICLE_STATUS_AMBIENT_TEMPERATURE`  | `/34183/1/7`  | Ambient Air Temperature (C)   |
| **Inside Temp**  | `VEHICLE_STATUS_INTERIOR_TEMPERATURE` | `/34183/1/56` | Current Cabin Temperature (C) |
| **Fan Level**    | `CLIMATE_INFORMATION_FAN_SPEED`       | `/34184/1/42` | AC Fan Speed Level            |
| **AC Status**    | `CLIMATE_CONTROL_AC_CONTROL_STATUS`   | `/34199/1/16` | AC System On/Off              |
| **Defrost**      | `CLIMATE_INFORMATION_FRONT_DEFROST`   | `/34184/1/9`  | Front Defrost Status          |

---

## 2. Advanced / Deep Scan Data

### 2.1 ECU Information (Hardware/Software Versions)

The system tracks detailed versioning for key Electronic Control Units (ECUs).

| ECU Name | Code          | Description                       |
| :------- | :------------ | :-------------------------------- |
| **VCU**  | `34220` (Var) | Vehicle Control Unit              |
| **BMS**  | `34220` (Var) | Battery Management System         |
| **BCM**  | `34220` (Var) | Body Control Module               |
| **HUD**  | `34220` (Var) | Head Up Display                   |
| **MHU**  | `34220` (Var) | Media Head Unit (Infotainment)    |
| **TBOX** | `34220` (Var) | Telematics Box                    |
| **ADAS** | `34220` (Var) | Advanced Driver Assistance System |

### 2.2 Advanced Battery Details

| Metric              | Alias Key                          | Path          | Description                           |
| :------------------ | :--------------------------------- | :------------ | :------------------------------------ |
| **Battery Type**    | `BMS_STATUS_BATTERY_TYPE`          | `34220/1/110` | Manufacturer/Chemistry (e.g., "CATL") |
| **Battery Serial**  | `BMS_STATUS_BATTERY_SERIAL_NUMBER` | `34220/1/111` | Unique Battery Pack Serial            |
| **12V Battery SOC** | `VEHICLE_STATUS_LV_BATTERY_SOC`    | `34183/1/5`   | Low Voltage Battery Charge Level      |

---

## 3. Extended / Future Data Points

### 3.1 Doors, Security & Locks

The system monitors lock status from two authoritative sources for better reliability.

| Metric                              | Path          | Status Logic             |
| :---------------------------------- | :------------ | :----------------------- |
| `CENTRAL_LOCK_STATUS`               | `/34183/1/81` | 1 = Locked, 0 = Unlocked |
| `REMOTE_CONTROL_DOOR_STATUS`        | `/34213/1/3`  | 1 = Locked, 0 = Unlocked |
| `DOOR_AJAR_FRONT_LEFT_DOOR_STATUS`  | `/10351/2/50` | 1 = Open, 0 = Closed     |
| `DOOR_AJAR_FRONT_RIGHT_DOOR_STATUS` | `/10351/1/50` | 1 = Open, 0 = Closed     |
| `DOOR_TRUNK_DOOR_STATUS`            | `/10351/6/50` | 1 = Open, 0 = Closed     |
| `DOOR_BONNET_DOOR_STATUS`           | `/10351/5/50` | 1 = Open, 0 = Closed     |
| `WINDOW_SUNROOF_STATUS`             | `/34215/5/2`  | Sunroof Position         |

### 3.2 Special Modes & Security

| Metric                      | Path         | Description                |
| :-------------------------- | :----------- | :------------------------- |
| `PET_MODE_CONTROL_STATUS`   | `/34207/1/1` | Pet Mode Status            |
| `CAMP_MODE_CONTROL_STATUS`  | `/34206/1/1` | Camp Mode Status           |
| `VALET_MODE_CONTROL_STATUS` | `/34205/1/1` | Valet Mode Status          |
| `INTRUSION_STATUS`          | `/34222/1/3` | Anti-Theft Intrusion Alarm |

### 3.3 Warnings & Telltales

_Prefix_: `VEHICLE_WARNINGS_...`

- `HV_BATTERY_LOW_SOC_WARNING_STATUS`
- `TIRE_PRESSURE_LOW_STATUS` (FL, FR, RL, RR)
- `BLIND_SPOT_DETECTION_...`
