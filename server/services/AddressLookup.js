const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const MAX_PENDING_REQUESTS = 20;
const REQUEST_INTERVAL_MS = 1100;

const cache = new Map();
let requestQueue = Promise.resolve();
let nextRequestAt = 0;
let pendingRequests = 0;

function getCachedResults(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return cached.results;
}

function mapAddress(result) {
  const address = result.address || {};
  return {
    placeId: result.place_id,
    displayName: result.display_name,
    houseBuildingNumber: address.house_number || "",
    street: address.road || address.residential || address.pedestrian || "",
    barangay:
      address.neighbourhood ||
      address.suburb ||
      address.village ||
      address.hamlet ||
      address.city_district ||
      address.quarter ||
      "",
    cityMunicipality:
      address.city || address.town || address.municipality || address.county || "",
    province: address.state || address.state_district || "",
    postalCode: address.postcode || "",
    country: address.country || "",
  };
}

async function requestAddresses(query, cacheKey) {
  const cachedResults = getCachedResults(cacheKey);
  if (cachedResults) return cachedResults;

  const waitMs = nextRequestAt - Date.now();
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Finote/1.0 (profile address lookup)",
      referer: process.env.CLIENT_URL || "http://localhost:5173",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Nominatim address lookup returned HTTP ${response.status}.`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload) ? payload.map(mapAddress) : [];
  cache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_DURATION_MS });
  if (cache.size > MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }

  return results;
}

function searchAddresses(value) {
  const query = value.trim().replace(/\s+/g, " ");
  if (query.length < 3 || query.length > 200) {
    return Promise.reject(new Error("Address searches must be 3 to 200 characters."));
  }

  const cacheKey = query.toLowerCase();
  const cachedResults = getCachedResults(cacheKey);
  if (cachedResults) return Promise.resolve(cachedResults);
  if (pendingRequests >= MAX_PENDING_REQUESTS) {
    return Promise.reject(new Error("Address search is busy. Try again shortly."));
  }

  pendingRequests += 1;
  const request = requestQueue.then(
    () => requestAddresses(query, cacheKey)
  ).finally(() => {
    pendingRequests -= 1;
  });
  requestQueue = request.then(
    () => undefined,
    () => undefined
  );

  return request;
}

module.exports = { searchAddresses };
