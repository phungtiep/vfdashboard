export const prerender = false;

import { REGIONS } from "../../config/vinfast";

export const POST = async ({ request, cookies }) => {
  try {
    const { region, rememberMe } = await request.json();

    const refresh_token = cookies.get("refresh_token")?.value;

    if (!refresh_token) {
      return new Response(
        JSON.stringify({ error: "No refresh token found" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const regionConfig = REGIONS[region] || REGIONS["vn"];

    const url = `https://${regionConfig.auth0_domain}/oauth/token`;
    const payload = {
      client_id: regionConfig.auth0_client_id,
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        // If refresh fails (e.g. invalid token), clear cookies
        cookies.delete("access_token", { path: "/" });
        cookies.delete("refresh_token", { path: "/" });
        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { "Content-Type": "application/json" }
        });
    }

    // Refresh successful, update cookies
    // Preserve existing Max-Age/Expiration logic?
    // Usually refresh extends the session.
    // We can infer persistence if the previous cookie had a maxAge, but `cookies.get` doesn't return metadata easily in all environments.
    // For simplicity, we'll treat refresh as "keep session alive".
    // If the original login was persistent, the browser sends the cookie.
    // We can't easily know if it was persistent here without an extra "remember_me" cookie.
    // Let's check `vf_region` cookie for maxAge hint or just check if it exists?
    // Actually, `cookies.get` just returns value.
    // Strategy: Use a default session cookie for refreshed tokens unless we know otherwise.
    // OR: Assume if `vf_region` persists (checked via logic? No), we persist.
    // Better: Set a separate cookie `vf_persistent` during login.

    // Renew session based on user preference
    const cookieOptions = {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
    };

    if (rememberMe) {
      cookieOptions.maxAge = 60 * 60 * 24 * 30; // 30 days
    }

    cookies.set("access_token", data.access_token, cookieOptions);
    if (data.refresh_token) {
      cookies.set("refresh_token", data.refresh_token, cookieOptions);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
