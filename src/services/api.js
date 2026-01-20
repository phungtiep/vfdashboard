import {
  REGIONS,
  DEFAULT_REGION,
  CORE_TELEMETRY_ALIASES,
  FALLBACK_TELEMETRY_RESOURCES,
} from "../config/vinfast";
import staticAliasMap from "../config/static_alias_map.json";
import { parseTelemetry } from "../utils/telemetryMapper";

class VinFastAPI {
  constructor() {
    this.region = DEFAULT_REGION;
    this.regionConfig = REGIONS[DEFAULT_REGION];
    // Tokens are now managed via HttpOnly cookies and not accessible here
    this.vin = null;
    this.userId = null;
    this.aliasMappings = staticAliasMap;
    this.rememberMe = false;

    // We assume logged in if metadata cookie exists, but real check is API call
    this.isLoggedIn = false;

    // Load session on init
    this.restoreSession();
  }

  setRegion(region) {
    this.region = region;
    this.regionConfig = REGIONS[region] || REGIONS[DEFAULT_REGION];
  }

  // Cookie Helpers - Only for non-sensitive metadata
  setCookie(name, value, days) {
    if (typeof document === "undefined") return;
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (encodeURIComponent(JSON.stringify(value)) || "") + expires + "; path=/; SameSite=Lax";
  }

  getCookie(name) {
    if (typeof document === "undefined") return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        try {
          return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  deleteCookie(name) {
    if (typeof document === "undefined") return;
    document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  }

  saveSession() {
    if (typeof window === "undefined") return;
    try {
      const data = {
        vin: this.vin,
        userId: this.userId,
        region: this.region,
        rememberMe: this.rememberMe,
        timestamp: Date.now(),
      };

      // Metadata cookie matches RememberMe duration
      this.setCookie("vf_session", data, this.rememberMe ? 30 : null);
    } catch (e) {
      console.error("Failed to save session", e);
    }
  }

  restoreSession() {
    if (typeof window === "undefined") return;
    try {
      const data = this.getCookie("vf_session");
      if (data) {
        this.vin = data.vin;
        this.userId = data.userId;
        this.rememberMe = !!data.rememberMe;
        if (data.region) this.setRegion(data.region);

        this.isLoggedIn = true; // Optimistic

        // We rely on background refresh or next API call to validate session
        // Proactive Refresh "Renew Mechanism"
        this.refreshAccessToken().catch(e => console.warn("Background refresh failed", e));
      } else {
        // Check for vf_region cookie if vf_session is missing (maybe new login flow)
        // But for now vf_session is our metadata source.
        this.isLoggedIn = false;
      }
    } catch (e) {
      console.error("Failed to restore session", e);
    }
  }

  clearSession() {
    if (typeof window === "undefined") return;
    this.deleteCookie("vf_session");
    // Also trigger backend to clear HttpOnly cookies if needed?
    // Usually browser clears session cookies on close, but for explicit logout we might need an endpoint.
    // For now, client side just forgets metadata.

    this.vin = null;
    this.userId = null;
    this.rememberMe = false;
    this.isLoggedIn = false;
  }

  _getHeaders() {
    // Mobile App Headers (simplified for browser CORS if needed, but keeping standard for now)
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      // Authorization is now injected by Proxy
      "x-service-name": "CAPP",
      "x-app-version": "1.10.3",
      "x-device-platform": "VFDashBoard",
      "x-device-family": "Community",
      "x-device-os-version": "1.0",
      "x-device-locale": "en-US",
      "x-timezone": "Asia/Ho_Chi_Minh",
      "x-device-identifier": "vfdashboard-community-edition",
    };
    if (this.vin) headers["x-vin-code"] = this.vin;
    if (this.userId) headers["x-player-identifier"] = this.userId;
    return headers;
  }

  async authenticate(email, password, region = "vn", rememberMe = false) {
    this.setRegion(region);
    this.rememberMe = rememberMe;

    // Use local proxy
    const url = `/api/login`;
    const payload = {
      email,
      password,
      region: this.region,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "An unexpected error occurred. Please try again.";
        try {
          const errorData = await response.json();
          // Use message from server if it's safe/clean, otherwise fallback based on status
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // JSON parse failed, stick to status mapping
        }

        if (response.status === 401) {
          errorMessage =
            "Incorrect email or password. Please check your credentials.";
        } else if (response.status === 403) {
          errorMessage =
            "Access denied. Your account may be locked or restricted.";
        } else if (response.status === 429) {
          errorMessage = "Too many attempts. Please try again later.";
        } else if (response.status >= 500) {
          errorMessage = "VinFast server error. Please try again later.";
        }

        throw new Error(errorMessage);
      }

      await response.json(); // Consume body

      this.isLoggedIn = true;
      this.saveSession();

      return { success: true };
    } catch (error) {
      console.error("Auth Error:", error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: this.region,
          rememberMe: this.rememberMe,
        }),
      });

      if (response.ok) {
        this.saveSession(); // Update metadata cookie expiration
        return true;
      } else {
        // console.warn("Refresh token failed:", await response.text());
        return false;
      }
    } catch (e) {
      console.error("Refresh token error:", e);
      return false;
    }
  }

  async _fetchWithRetry(url, options = {}) {
    // Inject headers
    options.headers = options.headers || this._getHeaders();

    let response = await fetch(url, options);

    if (response.status === 401) {
      console.warn("Received 401. Trying to refresh token...");
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry logic: Browser will automatically attach new Cookies to the next request
        response = await fetch(url, options);
      } else {
        // Refresh failed, likely session expired
        this.clearSession();
        window.location.href = "/login";
        throw new Error("Session expired");
      }
    }
    return response;
  }

  async getVehicles() {
    // Proxy user-vehicle
    // Original: ${this.regionConfig.api_base}/ccarusermgnt/api/v1/user-vehicle
    const proxyPath = `ccarusermgnt/api/v1/user-vehicle`;
    const url = `/api/proxy/${proxyPath}?region=${this.region}`;

    const response = await this._fetchWithRetry(url);
    if (!response.ok) throw new Error("Failed to fetch vehicles");

    const json = await response.json();

    if (json.data && json.data.length > 0) {
      // Auto-select first vehicle
      this.vin = json.data[0].vinCode;
      this.userId = json.data[0].userId;
      this.saveSession();
    }
    return json.data || [];
  }

  async getUserProfile() {
    // Use new proxy endpoint that supports cookie auth
    const url = `/api/user?region=${this.region}`;
    const response = await this._fetchWithRetry(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    }

    return await response.json();
  }

  // --- Full Telemetry Methods ---

  async getAliases(vin, version = "1.0") {
    if (vin) this.vin = vin;
    if (!this.vin) throw new Error("VIN is required");

    const proxyPath = `modelmgmt/api/v2/vehicle-model/mobile-app/vehicle/get-alias`;
    const url = `/api/proxy/${proxyPath}?region=${this.region}&version=${version}`;

    const response = await this._fetchWithRetry(url);
    if (!response.ok) throw new Error("Failed to fetch aliases");

    const json = await response.json();
    let resources = [];

    // Robust parsing logic
    if (json.data && json.data.resources) {
      resources = json.data.resources;
    } else if (json.data && json.data.data && json.data.data.resources) {
      resources = json.data.data.resources;
    } else if (Array.isArray(json.data)) {
      resources = json.data;
    } else if (Array.isArray(json.resources)) {
      resources = json.resources;
    } else if (Array.isArray(json)) {
      resources = json;
    }

    if (resources.length === 0) {
      console.warn("getAliases: No resources found in response:", json);
      // Handle business-logic 401 (sometimes in body with 200 OK)
      if (json.code === 401000 || json.message?.includes("expired")) {
        this.clearSession();
        window.location.href = "/login";
        throw new Error("Session expired (API Code 401000)");
      }
    }

    return resources;
  }

  async getRawTelemetry(vin, requestObjects) {
    if (vin) this.vin = vin;
    if (!this.vin) throw new Error("VIN is required");

    if (!requestObjects || requestObjects.length === 0) return [];

    const proxyPath = `ccaraccessmgmt/api/v1/telemetry/app/ping`;
    const url = `/api/proxy/${proxyPath}?region=${this.region}`;

    const response = await this._fetchWithRetry(url, {
      method: "POST",
      body: JSON.stringify(requestObjects),
    });

    if (!response.ok)
      throw new Error(`Raw Telemetry fetch failed: ${response.status}`);

    const json = await response.json();
    return json.data || [];
  }

  // --- External Integrations (Weather/Map) ---

  async fetchLocationName(lat, lon) {
    if (!lat || !lon) return null;
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      // Nominatim requires a User-Agent, browsers send one automatically but let's be polite if possible
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const a = data.address || {};
        const strip = (s) =>
          s
            ? s
                .replace(/^(Thành phố|Tỉnh|Quận|Huyện|Xã|Phường)\s+/gi, "")
                .trim()
            : s;

        const rawDistrict = a.city_district || a.district || a.county;
        const rawCity = a.city || a.town || a.village || a.state || a.province;

        return {
          location_address: [
            strip(rawDistrict),
            strip(rawCity),
            (a.country_code || "VN").toUpperCase(),
          ]
            .filter(Boolean)
            .join(", "),
          weather_address: [
            strip(rawCity),
            (a.country_code || "VN").toUpperCase(),
          ]
            .filter(Boolean)
            .join(", "),
        };
      }
    } catch (e) {
      console.warn("Location fetch failed", e);
    }
    return null;
  }

  async fetchWeather(lat, lon) {
    if (!lat || !lon) return null;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.current_weather;
      }
    } catch (e) {
      console.warn("Weather fetch failed", e);
    }
    return null;
  }

  async getTelemetry(vin) {
    if (vin) {
      this.vin = vin;
      this.saveSession();
    }
    if (!this.vin) throw new Error("VIN is required");

    const requestObjects = [];
    const pathToAlias = {};

    // Build Request List
    CORE_TELEMETRY_ALIASES.forEach((alias) => {
      if (this.aliasMappings[alias]) {
        const m = this.aliasMappings[alias];
        requestObjects.push({
          objectId: m.objectId,
          instanceId: m.instanceId,
          resourceId: m.resourceId,
        });
        const path = `/${m.objectId}/${m.instanceId}/${m.resourceId}`;
        pathToAlias[path] = alias;
      }
    });

    FALLBACK_TELEMETRY_RESOURCES.forEach((path) => {
      const parts = path.split("/").filter((p) => p);
      if (parts.length === 3) {
        // Deduplicate
        const exists = requestObjects.find(
          (r) =>
            r.objectId == parts[0] &&
            r.instanceId == parts[1] &&
            r.resourceId == parts[2],
        );
        if (!exists) {
          requestObjects.push({
            objectId: parts[0],
            instanceId: parts[1],
            resourceId: parts[2],
          });
        }
      }
    });

    const proxyPath = `ccaraccessmgmt/api/v1/telemetry/app/ping`;
    const url = `/api/proxy/${proxyPath}?region=${this.region}`;

    const response = await this._fetchWithRetry(url, {
      method: "POST",
      body: JSON.stringify(requestObjects),
    });

    if (!response.ok)
      throw new Error(`Telemetry fetch failed: ${response.status}`);

    const json = await response.json();
    const parsed = parseTelemetry(json.data, pathToAlias);

    // Enrich with Location/Weather if coordinates exist
    if (parsed.latitude && parsed.longitude) {
      try {
        // Create a timeout promise
        const timeout = new Promise((resolve) =>
          setTimeout(() => resolve([null, null]), 2000),
        );

        // Race between data fetch and timeout
        const [geo, weather] = await Promise.race([
          Promise.all([
            this.fetchLocationName(parsed.latitude, parsed.longitude),
            this.fetchWeather(parsed.latitude, parsed.longitude),
          ]),
          timeout,
        ]);

        if (geo) {
          parsed.location_address = geo.location_address;
          parsed.weather_address = geo.weather_address;
        }
        if (weather) {
          parsed.weather_outside_temp = weather.temperature;
          parsed.weather_code = weather.weathercode;
        }
      } catch (e) {
        console.warn("External enrichment failed or timed out", e);
        // Continue without enrichment
      }
    }

    return parsed;
  }
}

export const api = new VinFastAPI();
