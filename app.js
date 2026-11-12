"use strict";

const API = {
    geocode: "https://geocoding-api.open-meteo.com/v1/search",
    overpass: ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"]
};
const CATEGORY_FILTERS = {
    all: 'nwr[shop](around:{radius},{lat},{lon});nwr[office](around:{radius},{lat},{lon});nwr[amenity~"restaurant|cafe|fast_food"](around:{radius},{lat},{lon});nwr[leisure~"fitness_centre|sports_centre"](around:{radius},{lat},{lon});nwr[shop=car_repair](around:{radius},{lat},{lon});nwr[tourism~"hotel|guest_house|hostel|motel"](around:{radius},{lat},{lon});nwr[amenity~"doctors|dentist|clinic|pharmacy"](around:{radius},{lat},{lon});',
    restaurant: 'nwr[amenity~"restaurant|cafe|fast_food|bar|pub"](around:{radius},{lat},{lon});',
    retail: 'nwr[shop](around:{radius},{lat},{lon});',
    beauty: 'nwr[shop~"hairdresser|beauty|massage"](around:{radius},{lat},{lon});',
    professional: 'nwr[office](around:{radius},{lat},{lon});',
    fitness: 'nwr[leisure~"fitness_centre|sports_centre"](around:{radius},{lat},{lon});',
    automotive: 'nwr[shop=car_repair](around:{radius},{lat},{lon});',
    accommodation: 'nwr[tourism~"hotel|guest_house|hostel|motel"](around:{radius},{lat},{lon});',
    health: 'nwr[amenity~"doctors|dentist|clinic|pharmacy"](around:{radius},{lat},{lon});'
};
const SAMPLE_LOCATIONS = ["Portland, Oregon, USA", "Austin, Texas, USA", "London, United Kingdom", "Toronto, Canada", "Sydney, Australia", "Dublin, Ireland", "Amsterdam, Netherlands", "Auckland, New Zealand", "Vancouver, Canada", "Copenhagen, Denmark", "Melbourne, Australia", "Edinburgh, United Kingdom"];
let currentLeads = [];
let lastSearch = null;
let map = null;
let markerLayer = null;
function el(id) { return document.getElementById(id); }
function setStatus(message) { const status = el("command-status"); if (status) status.textContent = message; }
function cleanWebsite(value) {
    if (!value) return null;
    try { const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); return ["http:", "https:"].includes(url.protocol) ? url.href : null; }
    catch { return null; }
}
function businessCategory(tags) { return tags.shop || tags.amenity || tags.office || tags.leisure || tags.tourism || "Business"; }
function businessAddress(tags, fallback) {
    const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
    return [street, tags["addr:city"], tags["addr:postcode"]].filter(Boolean).join(", ") || fallback;
}
function toLead(item, area) {
    const tags = item.tags || {};
    const website = cleanWebsite(tags.website || tags["contact:website"] || tags.url);
    if (!website || !tags.name) return null;
    const point = item.center || item;
    return {name: tags.name, category: businessCategory(tags), address: businessAddress(tags, area), website,
        phone: tags.phone || tags["contact:phone"] || "", email: tags.email || tags["contact:email"] || "",
        opening_hours: tags.opening_hours || "", cuisine: tags.cuisine || "", latitude: point.lat ?? null,
        longitude: point.lon ?? null, osm_type: item.type, osm_id: item.id,
        osm_url: `https://www.openstreetmap.org/${encodeURIComponent(item.type)}/${encodeURIComponent(item.id)}`,
        status: "website_listed_unverified", evidence_note: "Public, community-contributed OpenStreetMap listing. Verify independently."};
}
function initMap() {
    const target = el("business-map");
    if (!target || !window.L) return;
    map = L.map(target, {scrollWheelZoom: false}).setView([37.3382, -121.8863], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
    markerLayer = L.featureGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 100);
}
function setProgress(active, message = "") {
    const wrap = el("progress-wrap"); if (!wrap) return;
    wrap.hidden = !active;
    if (el("progress-label")) el("progress-label").textContent = message;
}
async function fetchJson(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {...options, signal: controller.signal, headers: {Accept: "application/json", ...(options.headers || {})}});
        if (!response.ok) throw new Error(`Public data service returned HTTP ${response.status}.`);
        return await response.json();
    } finally { clearTimeout(timeout); }
}
async function queryOverpass(query) {
    const body = new URLSearchParams({data: query}); let lastError;
    for (const endpoint of API.overpass) {
        try { return await fetchJson(endpoint, {method: "POST", body}, 45000); }
        catch (error) { lastError = error; if (error.name === "AbortError" || /HTTP 4(?!29)/.test(error.message)) break; }
    }
    throw lastError || new Error("No public map service responded.");
}
async function runSearch() {
    const area = el("area")?.value.trim();
    if (!area) { setStatus("Enter a city or place to search."); el("area")?.focus(); return; }
    const category = el("category")?.value || "all";
    const radius = Number(el("radius")?.value || 3000);
    const limit = Number(el("limit")?.value || 30);
    const button = el("run-search"); if (button) button.disabled = true;
    currentLeads = []; renderResults([]); setProgress(true, `Finding ${area}…`);
    setStatus("Looking up the place using the public Open-Meteo geocoder…");
    if (el("results-title")) el("results-title").textContent = `Searching ${area}`;
    try {
        const geoUrl = `${API.geocode}?${new URLSearchParams({name: area, count: "5", language: "en", format: "json"})}`;
        const geo = await fetchJson(geoUrl, {}, 20000); const place = geo.results?.[0];
        if (!place) throw new Error("Place not found. Try a city and country, or choose a sample location.");
        const locationLabel = [place.name, place.admin1, place.country].filter((part, index, list) => part && list.indexOf(part) === index).join(", ");
        setProgress(true, `Searching public businesses around ${locationLabel}…`);
        setStatus(`Place found: ${locationLabel}. Querying OpenStreetMap…`);
        const fragments = (CATEGORY_FILTERS[category] || CATEGORY_FILTERS.all).replaceAll("{radius}", String(radius)).replaceAll("{lat}", String(place.latitude)).replaceAll("{lon}", String(place.longitude));
        const result = await queryOverpass(`[out:json][timeout:35];(${fragments});out center tags;`);
        const unique = new Map();
        for (const item of result.elements || []) {
            const lead = toLead(item, locationLabel); if (!lead) continue;
            const key = `${lead.name.toLocaleLowerCase()}|${new URL(lead.website).hostname}`;
            if (!unique.has(key)) unique.set(key, lead);
        }
        const candidates = [...unique.values()];
        candidates.sort((a, b) => ((Boolean(b.phone) + Boolean(b.opening_hours) + Boolean(b.email)) - (Boolean(a.phone) + Boolean(a.opening_hours) + Boolean(a.email))) || a.name.localeCompare(b.name));
        currentLeads = candidates.slice(0, limit);
        lastSearch = {area: locationLabel, category, radius_meters: radius, generated_at: new Date().toISOString(), attribution: "© OpenStreetMap contributors, ODbL", geocoding_source: "Open-Meteo Geocoding API", business_data_source: "OpenStreetMap via Overpass API", leads: currentLeads};
        renderResults(currentLeads); renderMap(currentLeads, [place.latitude, place.longitude]);
        if (el("results-title")) el("results-title").textContent = locationLabel;
        if (el("total")) el("total").textContent = `${currentLeads.length} results`;
        if (el("websites")) el("websites").textContent = `${currentLeads.length} found`;
        setStatus(currentLeads.length ? `Found ${currentLeads.length} public listing${currentLeads.length === 1 ? "" : "s"} with a website tag. Listings are not independently verified.` : "No website-bearing listings in this result. Try a wider distance or another category.");
        if (el("last-updated")) el("last-updated").textContent = `Searched in this browser · ${new Date(lastSearch.generated_at).toLocaleString()} · Open-Meteo + OpenStreetMap`;
        try { localStorage.setItem("signalscout:last-search", JSON.stringify({area, category, radius})); } catch { /* Optional browser storage. */ }
    } catch (error) {
        const message = error.name === "AbortError" ? "A public data service took too long to respond." : error.message;
        setStatus(`${message} Try again later; public APIs can be busy or rate-limited.`);
        if (el("results-title")) el("results-title").textContent = "Search could not complete";
        if (el("last-updated")) el("last-updated").textContent = "No results loaded.";
        renderResults([]); if (markerLayer) markerLayer.clearLayers();
    } finally { setProgress(false); if (button) button.disabled = false; }
}
function renderResults(leads) {
    const container = el("results"); if (!container) return;
    container.replaceChildren();
    if (!leads.length) {
        const empty = document.createElement("div"); empty.className = "empty-state";
        const heading = document.createElement("strong"); heading.textContent = "No results to show yet.";
        const detail = document.createElement("p"); detail.textContent = "Search a location to discover publicly listed businesses with websites.";
        empty.append(heading, detail); container.appendChild(empty);
    }
    for (const lead of leads) {
        const card = document.createElement("article"); card.className = "listing-card";
        const top = document.createElement("div"); top.className = "listing-card-top";
        const title = document.createElement("h3"); title.textContent = lead.name;
        const category = document.createElement("span"); category.className = "category-chip"; category.textContent = lead.category;
        top.append(title, category);
        const address = document.createElement("p"); address.className = "listing-address"; address.textContent = lead.address;
        const links = document.createElement("div"); links.className = "listing-links";
        const website = document.createElement("a"); website.href = lead.website; website.target = "_blank"; website.rel = "noopener noreferrer"; website.textContent = new URL(lead.website).hostname;
        const osm = document.createElement("a"); osm.href = lead.osm_url; osm.target = "_blank"; osm.rel = "noopener noreferrer"; osm.textContent = "Map source ↗";
        links.append(website, osm); card.append(top, address);
        const details = [lead.phone && `☎ ${lead.phone}`, lead.opening_hours && `Hours: ${lead.opening_hours}`].filter(Boolean);
        if (details.length) { const extra = document.createElement("p"); extra.className = "listing-extra"; extra.textContent = details.join(" · "); card.appendChild(extra); }
        card.appendChild(links); container.appendChild(card);
    }
    const json = el("export"); if (json) json.disabled = leads.length === 0;
    const csv = el("export-csv"); if (csv) csv.disabled = leads.length === 0;
}
function renderMap(leads, center) {
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    const bounds = [];
    for (const lead of leads) {
        if (!Number.isFinite(lead.latitude) || !Number.isFinite(lead.longitude)) continue;
        const marker = L.marker([lead.latitude, lead.longitude]);
        const popup = document.createElement("div");
        const name = document.createElement("strong"); name.textContent = lead.name;
        const link = document.createElement("a"); link.href = lead.website; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "Visit listed website";
        popup.append(name, document.createElement("br"), link);
        marker.bindPopup(popup); marker.addTo(markerLayer); bounds.push([lead.latitude, lead.longitude]);
    }
    if (bounds.length > 1) map.fitBounds(bounds, {padding: [28, 28], maxZoom: 14});
    else if (bounds.length === 1) map.setView(bounds[0], 15);
    else if (center) map.setView(center, 13);
    setTimeout(() => map.invalidateSize(), 100);
}
function downloadFile(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], {type})); const link = document.createElement("a");
    link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportJson() { if (lastSearch && currentLeads.length) downloadFile("signalscout-results.json", JSON.stringify(lastSearch, null, 2), "application/json"); }
function exportCsv() {
    if (!currentLeads.length) return;
    const fields = ["name", "category", "address", "website", "phone", "opening_hours", "latitude", "longitude", "osm_url"];
    const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
    downloadFile("signalscout-results.csv", [fields.join(","), ...currentLeads.map(lead => fields.map(field => quote(lead[field])).join(","))].join("\r\n"), "text/csv;charset=utf-8");
}
const runButton = el("run-search"); if (runButton) runButton.addEventListener("click", runSearch);
const areaInput = el("area"); if (areaInput) areaInput.addEventListener("keydown", event => { if (event.key === "Enter") runSearch(); });
const refreshButton = el("refresh"); if (refreshButton) refreshButton.addEventListener("click", runSearch);
const jsonButton = el("export"); if (jsonButton) jsonButton.addEventListener("click", exportJson);
const csvButton = el("export-csv"); if (csvButton) csvButton.addEventListener("click", exportCsv);
const randomButton = el("random-location"); if (randomButton) randomButton.addEventListener("click", () => { if (areaInput) areaInput.value = SAMPLE_LOCATIONS[Math.floor(Math.random() * SAMPLE_LOCATIONS.length)]; });
document.querySelectorAll("[data-location]").forEach(button => button.addEventListener("click", () => { if (areaInput) areaInput.value = button.dataset.location; }));
const sortSelect = el("sort"); if (sortSelect) sortSelect.addEventListener("change", () => {
    if (!currentLeads.length) return;
    if (sortSelect.value === "name") currentLeads.sort((a, b) => a.name.localeCompare(b.name));
    else currentLeads.sort((a, b) => ((Boolean(b.phone) + Boolean(b.opening_hours) + Boolean(b.email)) - (Boolean(a.phone) + Boolean(a.opening_hours) + Boolean(a.email))) || a.name.localeCompare(b.name));
    if (lastSearch) lastSearch.leads = currentLeads;
    renderResults(currentLeads); renderMap(currentLeads);
});
try {
    const saved = JSON.parse(localStorage.getItem("signalscout:last-search") || "null");
    if (saved && areaInput) { areaInput.value = saved.area; if (el("category")) el("category").value = saved.category; if (el("radius")) el("radius").value = String(saved.radius); }
} catch { /* Optional browser storage. */ }
const params = new URLSearchParams(window.location.search);
if (params.has("q") && areaInput) areaInput.value = params.get("q").slice(0, 160);
initMap();
