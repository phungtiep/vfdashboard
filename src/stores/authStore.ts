import { atom, onMount } from "nanostores";
import { api } from "../services/api";

export const isAuthenticated = atom(false);
export const userRegion = atom("vn");
export const userEmail = atom("");

onMount(isAuthenticated, () => {
  // Check if API has specific tokens loaded
  if (api.accessToken) {
    isAuthenticated.set(true);
    userRegion.set(api.region);
  } else {
    // Fallback check directly to localStorage if API hasn't init'd (though it should have in its constructor)
    // api.constructor calls restoreSession(), so api.accessToken should be populated if exists.

    // Double check restoration just in case or for reactive syncing
    api.restoreSession();
    if (api.accessToken) {
      isAuthenticated.set(true);
      userRegion.set(api.region);
    }
  }
});
