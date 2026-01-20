export const prerender = false;

import { REGIONS, DEFAULT_REGION, API_HEADERS } from "../../../config/vinfast";

export const ALL = async ({ request, params, cookies }) => {
  const path = params.path;
  const urlObj = new URL(request.url);
  const region = urlObj.searchParams.get("region") || DEFAULT_REGION;
  const regionConfig = REGIONS[region] || REGIONS[DEFAULT_REGION];

  // Strip internal params from query
  const targetSearchParams = new URLSearchParams(urlObj.search);
  targetSearchParams.delete("region");

  const searchStr = targetSearchParams.toString();
  const targetUrl = `${regionConfig.api_base}/${path}${searchStr ? "?" + searchStr : ""}`;

  const clientHeaders = request.headers;

  // Forward Auth Header
  // Priority: 1. Authorization header from client (if manual override)
  // 2. Cookie 'access_token' (Secure Proxy Mode)
  let authHeader = clientHeaders.get("Authorization");
  const vinHeader = clientHeaders.get("x-vin-code");

  if (!authHeader) {
      const cookieToken = cookies.get("access_token")?.value;
      if (cookieToken) {
          authHeader = `Bearer ${cookieToken}`;
      }
  }

  const proxyHeaders = {
    ...API_HEADERS, // standard headers
    "Content-Type": "application/json",
  };

  if (authHeader) proxyHeaders["Authorization"] = authHeader;
  if (vinHeader) proxyHeaders["x-vin-code"] = vinHeader;

  const init = {
    method: request.method,
    headers: proxyHeaders,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const response = await fetch(targetUrl, init);
    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
