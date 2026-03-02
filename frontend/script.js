// ================================
// GLOBAL STATE
// ================================
let scanHistory = JSON.parse(localStorage.getItem("scanHistory")) || [];
let severityChart = null;
let serviceChart = null;

// ================================
// NAVIGATION
// ================================
function showDashboard() {
    toggleSection("dashboard");
    loadDashboard();
}

function showHistory() {
    toggleSection("history");
    loadHistory();
}

function toggleSection(section) {
    const dashboard = document.getElementById("dashboardSection");
    const history = document.getElementById("historySection");

    dashboard.classList.toggle("hidden", section !== "dashboard");
    history.classList.toggle("hidden", section !== "history");

    document.getElementById("navDashboard").classList.toggle("active", section === "dashboard");
    document.getElementById("navHistory").classList.toggle("active", section === "history");
}

// ================================
// SCAN TRIGGER
// ================================
async function triggerScan() {
    try {
        setStatus("Scanning...", "#f39c12", true);

        const res = await fetch("/scan", { method: "POST" });
        if (!res.ok) throw new Error("Scan failed");

        const data = await res.json();
        const cisScore = calculateCISScore(data.summary);

        updateHistory(data, cisScore);
        loadDashboard();

        setStatus("Live", "#2ecc71", false);
    } catch (err) {
        console.error(err);
        setStatus("Scan Failed", "#e74c3c", false);
        alert("Scan failed. Please try again.");
    }
}

function setStatus(text, color, loading) {
    const loader = document.getElementById("loader");
    const indicator = document.getElementById("statusIndicator");

    loader.classList.toggle("hidden", !loading);
    indicator.style.color = color;
    indicator.innerText = `● ${text}`;
}

// ================================
// SCORE CALCULATION
// ================================
function calculateCISScore(summary) {
    const penalty =
        (summary.CRITICAL * 10) +
        (summary.HIGH * 6) +
        (summary.MEDIUM * 3);

    return Math.max(0, 100 - penalty);
}

// ================================
// DASHBOARD LOADING
// ================================
async function loadDashboard() {
    try {
        const res = await fetch("/report");
        if (!res.ok) throw new Error("Report fetch failed");

        const data = await res.json();
        const cisScore = calculateCISScore(data.summary);

        animateValue("risk", data.risk_score);
        animateValue("cisScore", cisScore);

        document.getElementById("total").innerText =
            data.summary.CRITICAL +
            data.summary.HIGH +
            data.summary.MEDIUM;

        document.getElementById("level").innerText = data.security_level;
        document.getElementById("lastScan").innerText =
            new Date(data.scan_time).toLocaleString();

        colorSecurityCard(data.security_level);
        updateCharts(data);
        updateCISBreakdown(data.summary);
        populateTable(data);

    } catch (err) {
        console.error(err);
    }
}

// ================================
// SECURITY CARD COLOR
// ================================
function colorSecurityCard(level) {
    const card = document.getElementById("securityCard");

    const colors = {
        "LOW RISK": "#eafaf1",
        "MODERATE RISK": "#fff4e6",
        "HIGH RISK": "#fdecea"
    };

    card.style.background = colors[level] || "#ffffff";
}

// ================================
// CHARTS
// ================================
function updateCharts(data) {

    if (severityChart) severityChart.destroy();
    if (serviceChart) serviceChart.destroy();

    // Severity Chart
    severityChart = new Chart(
        document.getElementById("severityChart"), {
        type: "doughnut",
        data: {
            labels: ["CRITICAL", "HIGH", "MEDIUM"],
            datasets: [{
                data: [
                    data.summary.CRITICAL,
                    data.summary.HIGH,
                    data.summary.MEDIUM
                ],
                backgroundColor: ["#e74c3c", "#f39c12", "#3498db"]
            }]
        },
        options: {
            responsive: true,
            cutout: "65%",
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });

    // Service Chart
    const serviceCounts = {};
    data.findings.forEach(f => {
        serviceCounts[f.service] = (serviceCounts[f.service] || 0) + 1;
    });

    serviceChart = new Chart(
        document.getElementById("serviceChart"), {
        type: "bar",
        data: {
            labels: Object.keys(serviceCounts),
            datasets: [{
                label: "Issues per Service",
                data: Object.values(serviceCounts),
                borderRadius: 6,
                backgroundColor: "#4da3ff"
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}

// ================================
// CIS BREAKDOWN
// ================================
function updateCISBreakdown(summary) {
    const container = document.getElementById("cisBreakdown");
    container.innerHTML = "";

    const controls = [
        { name: "IAM Controls", value: summary.HIGH },
        { name: "S3 Controls", value: summary.CRITICAL },
        { name: "EC2 Controls", value: summary.MEDIUM }
    ];

    controls.forEach(c => {
        const percentage = Math.max(0, 100 - (c.value * 10));
        const color =
            percentage > 80 ? "#2ecc71" :
            percentage > 50 ? "#f39c12" :
            "#e74c3c";

        const wrapper = document.createElement("div");
        wrapper.className = "progress-wrapper";

        wrapper.innerHTML = `
            <strong>${c.name}</strong>
            <div class="progress-bar">
                <div class="progress-fill"
                     style="width:${percentage}%; background:${color}">
                </div>
            </div>
        `;

        container.appendChild(wrapper);
    });
}

// ================================
// FINDINGS TABLE
// ================================
function populateTable(data) {
    const severityFilter = document.getElementById("severityFilter").value;
    const searchText = document.getElementById("searchInput").value.toLowerCase();
    const table = document.getElementById("findingsTable");

    table.innerHTML = "";

    const filtered = data.findings.filter(f =>
        (!severityFilter || f.severity === severityFilter) &&
        (!searchText || f.resource.toLowerCase().includes(searchText))
    );

    filtered.forEach(f => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${f.service}</td>
            <td>${f.resource}</td>
            <td>${f.issue}</td>
            <td>${getSeverityBadge(f.severity)}</td>
            <td>${f.region || "-"}</td>
        `;

        table.appendChild(row);
    });
}

function getSeverityBadge(severity) {
    const colors = {
        CRITICAL: "#e74c3c",
        HIGH: "#f39c12",
        MEDIUM: "#3498db"
    };

    return `
        <span class="severity-badge"
              style="background:${colors[severity] || "#999"}">
              ${severity}
        </span>
    `;
}

// ================================
// HISTORY
// ================================
function updateHistory(data, cisScore) {
    scanHistory.unshift({
        time: data.scan_time,
        score: data.risk_score,
        cis: cisScore,
        level: data.security_level
    });

    scanHistory = scanHistory.slice(0, 10);
    localStorage.setItem("scanHistory", JSON.stringify(scanHistory));
}

function loadHistory() {
    const table = document.getElementById("historyTable");
    table.innerHTML = "";

    scanHistory.forEach(h => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${new Date(h.time).toLocaleString()}</td>
            <td>${h.score}</td>
            <td>${h.cis}</td>
            <td>${h.level}</td>
        `;
        table.appendChild(row);
    });
}

// ================================
// ANIMATION
// ================================
function animateValue(id, end, duration = 800) {
    let start = 0;
    let startTime = null;

    function animation(currentTime) {
        if (!startTime) startTime = currentTime;

        const progress = currentTime - startTime;
        const value = Math.min(
            Math.floor((progress / duration) * end),
            end
        );

        document.getElementById(id).innerText = value;

        if (progress < duration) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

// ================================
// AUTO REFRESH
// ================================
setInterval(loadDashboard, 30000);
loadDashboard();