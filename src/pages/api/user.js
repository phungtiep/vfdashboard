export const prerender = false;

import { REGIONS, DEFAULT_REGION } from "../../config/vinfast";

export const GET = async ({ request, cookies }) => {
  try {
    const urlObj = new URL(request.url);
    const region = urlObj.searchParams.get("region") || DEFAULT_REGION;
    const regionConfig = REGIONS[region] || REGIONS[DEFAULT_REGION];

    const accessToken = cookies.get("access_token")?.value;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = `https://${regionConfig.auth0_domain}/userinfo`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
      },
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
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
