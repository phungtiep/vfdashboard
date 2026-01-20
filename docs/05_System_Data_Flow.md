# System Data Flow Documentation

This document describes the current implementation flow for Authentication, Vehicle Discovery, and Telemetry Retrieval in the VinFast Dashboard.

## 1. Authentication Flow (Login)

The authentication process utilizes the **Serverless Proxy** to communicate with VinFast's Auth0, bypassing CORS restrictions.

1.  **User Input**: User enters `email` and `password` on the Dashboard Login page (`/`).
2.  **Proxy Request**: Frontend (`api.js`) sends a POST request to `/api/login`.
3.  **Proxy Forwarding** (`src/pages/api/login.js`):
    - The Astro Server (running locally or on Edge) receives the credentials.
    - It forwards the request to `https://vin3s.au.auth0.com/oauth/token` (or regional equivalent).
4.  **Token Issuance**:
    - Auth0 returns an `access_token` and `refresh_token` to the Proxy.
    - The Proxy returns these tokens to the Browser.
5.  **Session Storage**:
    - The Frontend `api.js` saves the `access_token` and `refresh_token` to `localStorage`.
    - The `AuthStore` is updated, and the UI reveals the dashboard.

## 2. Token Refresh Flow

The system implements a strategy to handle expired Access Tokens (`401 Unauthorized`).

1.  **Trigger**: An API call (e.g., `getVehicles`) returns a `401`.
2.  **Refresh Logic**:
    - `api.js` intercepts the 401.
    - _(Current Buffer)_: It currently logs the user out to force re-authentication (Simplest secure path).
    - _Future_: Implement `/api/refresh` proxy to exchange `refresh_token` for new `access_token`.

## 3. Vehicle Discovery Flow

Once authenticated, the system discovers the user's vehicles.

1.  **Frontend Call**: `api.getVehicles()` is called.
2.  **Proxy Request**: It sends a GET request to `/api/proxy/ccarusermgnt/api/v1/user-vehicle`.
    - Headers: `Authorization: Bearer <token>`
3.  **Forwarding**: The Proxy forwards the request to the VinFast API.
4.  **Response**: The list of vehicles is returned to the Frontend.

## 4. Telemetry Retrieval Flow

This involves mapping human-readable "Aliases" to technical "Device IDs".

### A. Alias Mapping (Client-side)

Unlike the old backend approach, the mapping logic now lives in the **Frontend** (`src/utils/telemetryMapper.js`).

1.  **Config**: The Frontend loads `CORE_TELEMETRY_ALIASES` from `src/config/vinfast.js`.
2.  **Map Lookup**: It looks up the IDs in `src/config/static_alias_map.json` bundled with the app.

### B. Fetching Telemetry

1.  **Frontend Poll**: `VehicleStore` calls `api.getTelemetry(vin)`.
2.  **Construct Payload**: The browser constructs the JSON payload of IDs.
3.  **Proxy Request**: It sends a POST request to `/api/proxy/ccaraccessmgmt/api/v1/telemetry/app/ping` with the payload.
4.  **IP Distribution**:
    - The Proxy (on Cloudflare/Vercel) uses a rotating IP from the edge network to send the request to VinFast. **This prevents Rate Limiting.**
5.  **Raw Data Response**: VinFast returns the current values.

### C. Data Translation

1.  **Mapping Back**: `telemetryMapper.parseTelemetry()` translates the raw `deviceKey` (e.g., "34183/1/9") back to a friendly key (e.g., `battery_level`).
2.  **Logic Fixes**: Conversion of units, booleans, and fallback paths (e.g., for SOH or T-Box versions) happens here.
3.  **UI Update**: The data is merged into the `vehicleStore`, triggering React component re-renders.
