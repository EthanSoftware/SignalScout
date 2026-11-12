"use strict";

const API = {
    geocode: "https://geocoding-api.open-meteo.com/v1/search",
    overpass: "https://overpass-api.de/api/interpreter"
};
const CATEGORY_FILTERS = {
    all: '[shop](around:{radius},{lat},{lon});nwr[office](around:{radius},{lat},{lon});nwr[amenity~"restaurant|cafe|fast_food"](around:{radius},{lat},{lon});nwr[leisure~"fitness_centre|sports_centre"](around:{radius},{lat},{lon});nwr[shop=car_repair](around:{radius},{lat},{lon});nwr[tourism~"hotel|guest_house|hostel|motel"](around:{radius},{lat},{lon});nwr[amenity~"doctors|dentist|clinic|pharmacy"](around:{radius},{lat},{lon});',
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

function el(id) { return document.getElementById(id); }
function setStatus(message) { const status = el("command-status"); if (status) status.textContent = message; }
function cleanWebsite(value) {
    if (!value) return null;
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try { const url = new URL(candidate); return ["http:", "https:"].includes(url.protocol) ? url.href : null; }
    catch { return null; }
}
function businessCategory(tags) {
    return tags.shop || tags.amenity || tags.office || tags.leisure || tags.tourism || "Business";
}
function businessAddress(tags, fallback) {
    const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
    return [street, tags["addr:city"], tags["addr:postcode"]].filter(Boolean).join(", ") || fallback;
}
function toLead(item, area) {
    const tags = item.tags || {};
    const website = cleanWebsite(tags.website || tags["contact:website"] || tags["url"]);
    if (!website || !tags.name) return null;
    const point = item.center || item;
    return {
        name: tags.name,
        category: businessCategory(tags),
        address: businessAddress(tags, area),
        website,
        phone: tags.phone || tags["contact:phone"] || "",
        email: tags.email || tags["contact:email"] || "",
        opening_hours: tags.opening_hours || "",
        cuisine: tags.cuisine || "",
        latitude: point.lat ?? null,
        longitude: point.lon ?? null,
        osm_type: item.type,
        osm_id: item.id,
        osm_url: `https://www.openstreetmap.org/${encodeURIComponent(item.type)}/${encodeURIComponent(item.id)}`,
        performance_score: null,
        status: "website_listed_unverified",
        evidence_note: "Website and business details are community-contributed OpenStreetMap tags; verify independently."
    };
}
function setProgress(active, message = "") {
    const wrap = el("progress-wrap");
    if (!wrap) return;
    wrap.hidden = !active;
    if (el("progress-label")) el("progress-label").textContent = message;
    if (el("progress-bar")) el("progress-bar").style.width = active ? "65%" : "100%";
}
async function fetchJson(url, options = {}, timeoutMs = 45000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {...options, signal: controller.signal, headers: {Accept: "application/json", ...(options.headers || {})}});
        if (!response.ok) throw new Error(`Public data service returned HTTP ${response.status}. Try again in a moment.`);
        return await response.json();
    } finally { clearTimeout(timeout); }
}
async function runSearch() {
    const area = el("area")?.value.trim();
    if (!area) { setStatus("Enter a city or place to search."); return; }
    const category = el("category")?.value || "all";
    const radius = Number(el("radius")?.value || 3000);
    const limit = Number(el("limit")?.value || 30);
    const button = el("run-search");
    if (button) button.disabled = true;
    currentLeads = [];
    renderResults([]);
    setProgress(true, `Finding ${area}…`);
    setStatus("Looking up the selected place using Open-Meteo geocoding…");
    if (el("results-title")) el("results-title").textContent = `Searching ${area}`;
    try {
        const geoUrl = `${API.geocode}?${new URLSearchParams({name: area, count: "1", language: "en", format: "json"})}`;
        const geo = await fetchJson(geoUrl, {}, 20000);
        const place = geo.results?.[0];
        if (!place) throw new Error("We couldn't find that place. Try a nearby city name, region, or country.");
        const locationLabel = [place.name, place.admin1, place.country].filter((part, index, list) => part && list.indexOf(part) === index).join(", ");
        setProgress(true, `Searching OpenStreetMap around ${locationLabel}…`);
        setStatus(`Place found: ${locationLabel}. Loading public business listings…`);
        const filter = CATEGORY_FILTERS[category] || CATEGORY_FILTERS.all;
        const fragments = filter.replaceAll("{radius}", String(radius)).replaceAll("{lat}", String(place.latitude)).replaceAll("{lon}", String(place.longitude));
        const query = `[out:json][timeout:35];(${fragments});out center tags;`;
        const body = new URLSearchParams({data: query});
        const result = await fetchJson(API.overpass, {method: "POST", body}, 50000);
        const dedupe = new Set();
        const candidates = (result.elements || []).map(item => toLead(item, locationLabel)).filter(Boolean).filter(item => {
            const key = `${item.name.toLocaleLowerCase()}|${new URL(item.website).hostname}`;
            if (dedupe.has(key)) return false;
            dedupe.add(key);
            return true;
        });
        // Rank rows with richer public information first, keeping website-bearing listings only.
        candidates.sort((a, b) => ((Boolean(b.phone) + Boolean(b.email) + Boolean(b.opening_hours)) - (Boolean(a.phone) + Boolean(a.email) + Boolean(a.opening_hours))) || a.name.localeCompare(b.name));
        currentLeads = candidates.slice(0, limit);
        lastSearch = {area: locationLabel, category, radius, generated_at: new Date().toISOString(), attribution: "© OpenStreetMap contributors, ODbL", geocoding_source: "Open-Meteo Geocoding API", business_data_source: "OpenStreetMap via Overpass API", leads: currentLeads};
        renderResults(currentLeads);
        if (el("results-title")) el("results-title").textContent = locationLabel;
        if (el("total")) el("total").textContent = String(currentLeads.length);
        if (el("websites")) el("websites").textContent = String(currentLeads.length);
        if (el("review")) el("review").textContent = "OSM";
        const message = currentLeads.length ? `Found ${currentLeads.length} public listing${currentLeads.length === 1 ? "" : "s"} with a website. Listing details are unverified.` : "No website-bearing listings found in this area. Try a larger radius or another category.";
        setStatus(message);
        if (el("last-updated")) el("last-updated").textContent = `Searched ${locationLabel} · ${new Date(lastSearch.generated_at).toLocaleString()} · OpenStreetMap / Open-Meteo`;
    } catch (error) {
        const message = error.name === "AbortError" ? "The public data service took too long to respond. Please retry later." : error.message;
        setStatus(`${message} Public services may be busy or block browser requests; the Python scanner is an alternative.`);
        if (el("results-title")) el("results-title").textContent = "Search could not complete";
        if (el("last-updated")) el("last-updated").textContent = "No results loaded.";
        renderResults([]);
    } finally {
        setProgress(false);
        if (button) button.disabled = false;
    }
}
function renderResults(leads) {
    const table = el("results");
    if (!table) return;
    table.replaceChildren();
    if (!leads.length) {
        const row = table.insertRow(); const cell = row.insertCell();
        cell.colSpan = 3; cell.textContent = "Choose a location and start a search. Live results will appear here.";
    }
    for (const lead of leads) {
        const row = table.insertRow();
        const business = row.insertCell();
        const title = document.createElement("strong"); title.textContent = lead.name; business.appendChild(title);
        const detail = document.createElement("div"); detail.className = "business-details";
        detail.textContent = [lead.category, lead.address, lead.phone && `Tel: ${lead.phone}`, lead.email && `Email: ${lead.email}`, lead.opening_hours && `Hours: ${lead.opening_hours}`].filter(Boolean).join(" · "); business.appendChild(detail);
        const websiteCell = row.insertCell();
        const website = document.createElement("a"); website.href = lead.website; website.target = "_blank"; website.rel = "noopener noreferrer"; website.textContent = new URL(lead.website).hostname; websiteCell.appendChild(website);
        const mapCell = row.insertCell();
        const map = document.createElement("a"); map.href = lead.osm_url; map.target = "_blank"; map.rel = "noopener noreferrer"; map.textContent = "OpenStreetMap ↗"; mapCell.appendChild(map);
    }
    const jsonButton = el("export"); if (jsonButton) jsonButton.disabled = leads.length === 0;
    const csvButton = el("export-csv"); if (csvButton) csvButton.disabled = leads.length === 0;
}
function downloadFile(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportJson() {
    if (!lastSearch || !currentLeads.length) return;
    downloadFile("signalscout-results.json", JSON.stringify(lastSearch, null, 2), "application/json");
}
function exportCsv() {
    if (!currentLeads.length) return;
    const fields = ["name", "category", "address", "website", "phone", "email", "opening_hours", "latitude", "longitude", "osm_url"];
    const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [fields.join(","), ...currentLeads.map(lead => fields.map(field => quote(lead[field])).join(","))].join("\r\n");
    downloadFile("signalscout-results.csv", csv, "text/csv;charset=utf-8");
}
const runButton = el("run-search"); if (runButton) runButton.addEventListener("click", runSearch);
const refreshButton = el("refresh"); if (refreshButton) refreshButton.addEventListener("click", () => lastSearch ? runSearch() : setStatus("Run a search first."));
const jsonButton = el("export"); if (jsonButton) jsonButton.addEventListener("click", exportJson);
const csvButton = el("export-csv"); if (csvButton) csvButton.addEventListener("click", exportCsv);
const randomButton = el("random-location"); if (randomButton) randomButton.addEventListener("click", () => { el("area").value = SAMPLE_LOCATIONS[Math.floor(Math.random() * SAMPLE_LOCATIONS.length)]; });
document.querySelectorAll("[data-location]").forEach(button => button.addEventListener("click", () => { el("area").value = button.dataset.location; }));
const params = new URLSearchParams(window.location.search);
if (params.has("q") && el("area")) el("area").value = params.get("q").slice(0, 160);
