"use strict";

let currentLeads = [];

async function loadResults() {
    const table = document.getElementById("results");
    if (!table) return;

    const statusMessage = document.getElementById("last-updated");
    table.replaceChildren();
    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");
    loadingCell.colSpan = 4;
    loadingCell.textContent = "Loading local leads.json…";
    loadingRow.appendChild(loadingCell);
    table.appendChild(loadingRow);

    try {
        const response = await fetch("leads.json", {cache: "no-store"});
        if (!response.ok) throw new Error("No local results file found.");
        const data = await response.json();
        if (!data || !Array.isArray(data.leads)) throw new Error("The results file has an invalid format.");
        currentLeads = data.leads;

        document.getElementById("total").textContent = String(currentLeads.length);
        document.getElementById("websites").textContent = String(currentLeads.filter(item => item && item.website).length);
        document.getElementById("review").textContent = String(currentLeads.filter(item => item && item.status === "review").length);
        table.replaceChildren();

        if (!currentLeads.length) {
            const row = table.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 4;
            cell.textContent = "The scan completed but returned no named businesses.";
        }

        for (const lead of currentLeads) {
            const row = document.createElement("tr");
            const business = document.createElement("td");
            const name = document.createElement("strong");
            name.textContent = lead.name || "Unnamed business";
            business.appendChild(name);
            const website = document.createElement("td");
            try {
                const parsed = lead.website ? new URL(lead.website) : null;
                if (parsed && ["https:", "http:"].includes(parsed.protocol)) {
                    const link = document.createElement("a");
                    link.href = parsed.href;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    link.textContent = parsed.hostname;
                    website.appendChild(link);
                } else {
                    website.textContent = "Not listed";
                }
            } catch {
                website.textContent = "Invalid URL";
            }
            const performance = document.createElement("td");
            performance.textContent = lead.performance_score == null ? "Not checked" : `${lead.performance_score}/100`;
            const status = document.createElement("td");
            status.textContent = lead.status || "Unreviewed";
            row.append(business, website, performance, status);
            table.appendChild(row);
        }
        if (statusMessage) {
            const generated = data.generated_at ? new Date(data.generated_at) : null;
            statusMessage.textContent = generated && !Number.isNaN(generated.getTime()) ? `Loaded ${currentLeads.length} results · ${generated.toLocaleString()}` : `Loaded ${currentLeads.length} results.`;
        }
    } catch (error) {
        currentLeads = [];
        table.replaceChildren();
        const row = table.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.textContent = "No results available. Run scanner.py locally, then refresh this page.";
        if (statusMessage) statusMessage.textContent = error.message;
    }
}

const copyButton = document.getElementById("copy-command");
if (copyButton) {
    copyButton.addEventListener("click", async () => {
        const area = document.getElementById("area").value.trim().replace(/[\r\n"\\]/g, " ");
        const category = document.getElementById("category").value;
        const limit = document.getElementById("limit").value;
        if (!area) {
            document.getElementById("command-status").textContent = "Enter a location first.";
            return;
        }
        const command = `python scanner.py --area "${area}" --category ${category} --limit ${limit}`;
        try {
            await navigator.clipboard.writeText(command);
            document.getElementById("command-status").textContent = "Command copied. Run it in a terminal from the SignalScout project directory.";
        } catch {
            document.getElementById("command-status").textContent = command;
        }
    });
}

const refreshButton = document.getElementById("refresh");
if (refreshButton) refreshButton.addEventListener("click", loadResults);

const exportButton = document.getElementById("export");
if (exportButton) {
    exportButton.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify({leads: currentLeads}, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "signalscout-leads.json";
        link.click();
        URL.revokeObjectURL(url);
    });
}

loadResults();
