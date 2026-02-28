// ==============================
// 🔥 Persistent Scan History
// ==============================

let scanHistory = JSON.parse(localStorage.getItem("scanHistory")) || [];

// ==============================
// 🧭 Navigation
// ==============================

function showDashboard() {
    document.getElementById("dashboardSection").classList.remove("hidden");
    document.getElementById("historySection").classList.add("hidden");
}

function showHistory() {
    document.getElementById("dashboardSection").classList.add("hidden");
    document.getElementById("historySection").classList.remove("hidden");
    loadHistory();
}

// ==============================
// 🚀 Trigger Scan
// ==============================

async function triggerScan() {
    const loader = document.getElementById("loader");
    loader.classList.remove("hidden");

    try {
        const res = await fetch("/scan", { method: "POST" });

        if (!res.ok) throw new Error("Scan failed");

        const data = await res.json();

        // Save history
        scanHistory.unshift({
            time: data.scan_time,
            score: data.risk_score,
            level: data.security_level
        });

        // Keep only last 10 scans
        scanHistory = scanHistory.slice(0, 10);

        localStorage.setItem("scanHistory", JSON.stringify(scanHistory));

        await loadDashboard();

    } catch (err) {
        alert("Scan failed. Check backend.");
        console.error(err);
    }

    loader.classList.add("hidden");
}

// ==============================
// 📊 Load Dashboard
// ==============================

async function loadDashboard() {

    try {
        const res = await fetch("/report");
        if (!res.ok) return;

        const data = await res.json();

        const severityFilter = document.getElementById("severityFilter").value;
        const searchText = document.getElementById("searchInput").value.toLowerCase();

        // Summary
        document.getElementById("total").innerText =
            data.summary.CRITICAL +
            data.summary.HIGH +
            data.summary.MEDIUM;

        document.getElementById("risk").innerText = data.risk_score;
        document.getElementById("level").innerText = data.security_level;
        document.getElementById("lastScan").innerText = new Date(data.scan_time).toLocaleString();

        // 🎯 Risk Color
        const level = document.getElementById("level");
        if (data.security_level === "LOW RISK") {
            level.style.color = "#2ecc71";
        } else if (data.security_level === "MODERATE RISK") {
            level.style.color = "#f39c12";
        } else {
            level.style.color = "#e74c3c";
        }

        // Table
        const table = document.getElementById("findingsTable");
        table.innerHTML = "";

        const filteredFindings = data.findings.filter(f =>
            (!severityFilter || f.severity === severityFilter) &&
            (!searchText || f.resource.toLowerCase().includes(searchText))
        );

        if (filteredFindings.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:20px;">
                        No findings match filter.
                    </td>
                </tr>
            `;
        }

        filteredFindings.forEach(f => {
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

    } catch (err) {
        console.error("Dashboard load error:", err);
    }
}

// ==============================
// 🎨 Severity Badge
// ==============================

function getSeverityBadge(severity) {
    const colors = {
        CRITICAL: "#e74c3c",
        HIGH: "#f39c12",
        MEDIUM: "#3498db"
    };

    return `
        <span style="
            background:${colors[severity]};
            color:white;
            padding:4px 10px;
            border-radius:20px;
            font-size:12px;
            font-weight:500;">
            ${severity}
        </span>
    `;
}

// ==============================
// 📜 Scan History
// ==============================

function loadHistory() {
    const table = document.getElementById("historyTable");
    table.innerHTML = "";

    if (scanHistory.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="3" style="text-align:center; padding:20px;">
                    No scan history available.
                </td>
            </tr>
        `;
        return;
    }

    scanHistory.forEach(h => {
        table.innerHTML += `
            <tr>
                <td>${new Date(h.time).toLocaleString()}</td>
                <td>${h.score}</td>
                <td>${h.level}</td>
            </tr>
        `;
    });
}

// ==============================
// 🔄 Auto Refresh Every 30s
// ==============================

setInterval(loadDashboard, 30000);

// Initial load
loadDashboard();