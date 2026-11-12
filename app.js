
"use strict";

let currentLeads = [];

async function loadResults() {
    const table = document.getElementById("results");
    if (!table) return;

    try {
        const response = await fetch("leads.json", {
            cache: "no-store"
        });

        if (!response.ok) throw new Error("No results");

        const data = await response.json();

        if (!Array.isArray(data.leads)) {
            throw new Error("Invalid results file");
        }

        currentLeads = data.leads;

        document.getElementById("total").textContent =
            currentLeads.length;

        document.getElementById("websites").textContent =
            currentLeads.filter(x => x.website).length;

        document.getElementById("review").textContent =
            currentLeads.filter(x => x.status === "review").length;

        table.replaceChildren();

        for (const lead of currentLeads) {
            const row = document.createElement("tr");

            const business = document.createElement("td");
            const name = document.createElement("strong");
            name.textContent = lead.name || "Unnamed business";
            business.appendChild(name);

            const website = document.createElement("td");

            if (lead.website) {
                const link = document.createElement("a");
                link.href = lead.website;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = new URL(lead.website).hostname;
                website.appendChild(link);
            } else {
                website.textContent = "Not listed";
            }

            const performance = document.createElement("td");
            performance.textContent =
                lead.performance_score == null
                ? "Not checked"
                : `${lead.performance_score}/100`;

            const status = document.createElement("td");
            status.textContent = lead.status || "Unreviewed";

            row.append(business, website, performance, status);
            table.appendChild(row);
        }

        document.getElementById("last-updated").textContent =
            `Updated: ${new Date(data.generated_at).toLocaleString()}`;

    } catch {
        table.innerHTML =
            '<tr><td colspan="4">No results available. Run scanner.py first.</td></tr>';
    }
}

const copyButton = document.getElementById("copy-command");

if (copyButton) {
    copyButton.addEventListener("click", async () => {
        const area = document.getElementById("area").value
            .replace(/"/g, "");

        const category = document.getElementById("category").value;
        const limit = document.getElementById("limit").value;

        const command =
            `python scanner.py --area "${area}" --category ${category} --limit ${limit}`;

        try {
            await navigator.clipboard.writeText(command);
            document.getElementById("command-status").textContent =
                "Command copied! Paste it into your terminal.";
        } catch {
            document.getElementById("command-status").textContent =
                command;
        }
    });
}

const refreshButton = document.getElementById("refresh");

if (refreshButton) {
    refreshButton.addEventListener("click", loadResults);
}

const exportButton = document.getElementById("export");

if (exportButton) {
    exportButton.addEventListener("click", () => {
        const blob = new Blob(
            [JSON.stringify({leads: currentLeads}, null, 2)],
            {type: "application/json"}
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "signalscout-leads.json";
        link.click();

        URL.revokeObjectURL(url);
    });
}

loadResults();
