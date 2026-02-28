let scanHistory = [];

function showDashboard() {
    document.getElementById("dashboardSection").classList.remove("hidden");
    document.getElementById("historySection").classList.add("hidden");
}

function showHistory() {
    document.getElementById("dashboardSection").classList.add("hidden");
    document.getElementById("historySection").classList.remove("hidden");
    loadHistory();
}

async function triggerScan() {
    document.getElementById("loader").classList.remove("hidden");

    const res = await fetch("/scan", { method: "POST" });
    const data = await res.json();

    scanHistory.push({
        time: data.scan_time,
        score: data.risk_score,
        level: data.security_level
    });

    document.getElementById("loader").classList.add("hidden");

    loadDashboard();
}

async function loadDashboard() {

    const res = await fetch("/report");
    const data = await res.json();

    const severityFilter = document.getElementById("severityFilter").value;
    const searchText = document.getElementById("searchInput").value.toLowerCase();


    const level = document.getElementById("level");
    if (data.security_level === "LOW RISK") {
        level.style.color = "#2ecc71";
    }
    else if (data.security_level === "MODERATE RISK") {
        level.style.color = "#f39c12";
    }
    else {
        level.style.color = "#e74c3c";
    }

    document.getElementById("total").innerText =
        data.summary.CRITICAL +
        data.summary.HIGH +
        data.summary.MEDIUM;

    document.getElementById("risk").innerText = data.risk_score;
    document.getElementById("level").innerText = data.security_level;
    document.getElementById("lastScan").innerText = data.scan_time;

    const table = document.getElementById("findingsTable");
    table.innerHTML = "";

    data.findings
        .filter(f =>
            (!severityFilter || f.severity === severityFilter) &&
            (!searchText || f.resource.toLowerCase().includes(searchText))
        )
        .forEach(f => {
            table.innerHTML += `
                <tr>
                    <td>${f.service}</td>
                    <td>${f.resource}</td>
                    <td>${f.issue}</td>
                    <td>${getSeverityBadge(f.severity)}</td>
                    <td>${f.region || "-"}</td>
                </tr>
            `;
        });
}

function getSeverityBadge(severity) {
    const colors = {
        CRITICAL: "#e74c3c",
        HIGH: "#f39c12",
        MEDIUM: "#3498db"
    };

    return `<span style="
        background:${colors[severity]};
        color:white;
        padding:4px 10px;
        border-radius:20px;
        font-size:12px;
        font-weight:500;">
        ${severity}
    </span>`;
}


function loadHistory() {
    const table = document.getElementById("historyTable");
    table.innerHTML = "";

    scanHistory.forEach(h => {
        table.innerHTML += `
            <tr>
                <td>${h.time}</td>
                <td>${h.score}</td>
                <td>${h.level}</td>
            </tr>
        `;
    });
}

loadDashboard();