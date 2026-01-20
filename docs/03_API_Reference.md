# VinFast Dashboard - API Reference

**Version:** 2.0  
**Status:** VALIDATED  
**Date:** Jan 2026

---

## 1. Overview

This architecture uses a **Serverless Proxy** approach. The Frontend communicates with `localhost/api/*` (or the deployed domain), and the Astro Server functions forward these requests to VinFast.

### Base Configuration

- **Proxy Base URL**: `/api`
- **Auth0 Domain**: Handled by Proxy based on Region.

---

## 2. Proxy Endpoints

These endpoints are served by the Astro Server (Node.js/Cloudflare/Vercel).

### 2.1 Login Proxy

**Endpoint**: `POST /api/login`

- **Purpose**: Authenticate with VinFast Auth0 without triggering CORS errors.
- **Body**: `{ email, password, region }`
- **Response**: `{ access_token, refresh_token, id_token, ... }`

### 2.2 Generic API Proxy

**Endpoint**: `ANY /api/proxy/{...path}`

- **Purpose**: Forward requests to VinFast Connected Car API.
- **Headers**: Requires `Authorization: Bearer <token>` and `x-vin-code`.
- **Usage**:
  - `GET /api/proxy/ccarusermgnt/api/v1/user-vehicle` -> Fetches Vehicles.
  - `POST /api/proxy/ccaraccessmgmt/api/v1/telemetry/app/ping` -> Fetches Telemetry.

---

## 3. Client Service (`src/services/api.js`)

The application uses the `VinFastAPI` class to encapsulate all logic.

### 3.1 `api.authenticate(email, password, region)`

- Calls `/api/login`.
- Saves session to `localStorage`.

### 3.2 `api.getVehicles()`

- Calls `/api/proxy` to retrieve vehicle list.
- Returns array of vehicle objects.

### 3.3 `api.getTelemetry(vin)`

- **Complex Flow**:
  1.  Constructs list of Resource IDs from `static_alias_map.json`.
  2.  Calls `/api/proxy/.../ping` to get raw values.
  3.  Parses raw values using `telemetryMapper`.
  4.  Fetches Weather (Open-Meteo) and Address (Nominatim) directly (with 2s timeout race condition to prevent blocking).
  5.  Returns combined, normalized data object.

---

## 4. Control Limitations

> **IMPORTANT**: Remote Control Commands (Lock/Unlock, Climate Start) are **Read-Only**.

The dashboard can **display** lock status (`is_locked`) and climate status (`fan_speed`, `inside_temp`), but it cannot **change** them. Command signing requires a private key stored in the mobile app's keystore, which is not accessible to this web dashboard.
