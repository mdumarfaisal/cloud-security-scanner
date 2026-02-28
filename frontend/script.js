let scanHistory = JSON.parse(localStorage.getItem("scanHistory")) || [];
let severityChart;
let serviceChart;

function showDashboard() {
    document.getElementById("dashboardSection").classList.remove("hidden");
    document.getElementById("historySection").classList.add("hidden");
    setActive("dashboard");
}

function showHistory() {
    document.getElementById("dashboardSection").classList.add("hidden");
    document.getElementById("historySection").classList.remove("hidden");
    setActive("history");
    loadHistory();
}

function setActive(section) {
    document.getElementById("navDashboard").classList.remove("active");
    document.getElementById("navHistory").classList.remove("active");

    if (section === "dashboard")
        document.getElementById("navDashboard").classList.add("active");
    else
        document.getElementById("navHistory").classList.add("active");
}

async function triggerScan() {
    document.getElementById("loader").classList.remove("hidden");
    document.getElementById("statusIndicator").innerHTML =
        "<span style='color:#f39c12'>● Scanning...</span>";

    const res = await fetch("/scan", { method: "POST" });
    const data = await res.json();

    const cisScore = calculateCISScore(data.summary);

    scanHistory.unshift({
        time: data.scan_time,
        score: data.risk_score,
        cis: cisScore,
        level: data.security_level
    });

    scanHistory = scanHistory.slice(0, 10);
    localStorage.setItem("scanHistory", JSON.stringify(scanHistory));

    document.getElementById("loader").classList.add("hidden");
    document.getElementById("statusIndicator").innerHTML =
        "<span style='color:#2ecc71'>● Live</span>";

    loadDashboard();
}

function calculateCISScore(summary) {
    const totalIssues = summary.CRITICAL + summary.HIGH + summary.MEDIUM;
    const maxScore = 100;
    const penalty = totalIssues * 5;
    return Math.max(0, maxScore - penalty);
}

async function loadDashboard() {

    const res = await fetch("/report");
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

    updateCharts(data);
    updateCISBreakdown(data.summary);
    populateTable(data);
}

function updateCharts(data) {

    if (severityChart) severityChart.destroy();
    if (serviceChart) serviceChart.destroy();

    severityChart = new Chart(document.getElementById("severityChart"), {
        type: "pie",
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
        }
    });

    const serviceCounts = {};
    data.findings.forEach(f => {
        serviceCounts[f.service] =
            (serviceCounts[f.service] || 0) + 1;
    });

    serviceChart = new Chart(document.getElementById("serviceChart"), {
        type: "bar",
        data: {
            labels: Object.keys(serviceCounts),
            datasets: [{
                label: "Issues per Service",
                data: Object.values(serviceCounts),
                backgroundColor: "#4da3ff"
            }]
        }
    });
}

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

        container.innerHTML += `
            <div style="margin-bottom:10px;">
                ${c.name}
                <div style="background:#eee; height:10px; border-radius:5px;">
                    <div style="
                        width:${percentage}%;
                        height:10px;
                        background:#2ecc71;
                        border-radius:5px;">
                    </div>
                </div>
            </div>
        `;
    });
}

function populateTable(data) {
    const severityFilter = document.getElementById("severityFilter").value;
    const searchText = document.getElementById("searchInput").value.toLowerCase();
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
        font-size:12px;">
        ${severity}
    </span>`;
}

function loadHistory() {
    const table = document.getElementById("historyTable");
    table.innerHTML = "";

    scanHistory.forEach(h => {
        table.innerHTML += `
            <tr>
                <td>${new Date(h.time).toLocaleString()}</td>
                <td>${h.score}</td>
                <td>${h.cis}</td>
                <td>${h.level}</td>
            </tr>
        `;
    });
}

function animateValue(id, end, duration = 600) {
    let start = 0;
    let startTime = null;

    function animation(currentTime) {
        if (!startTime) startTime = currentTime;
        const progress = currentTime - startTime;
        const value = Math.min(Math.floor((progress / duration) * end), end);
        document.getElementById(id).innerText = value;

        if (progress < duration)
            requestAnimationFrame(animation);
    }

    requestAnimationFrame(animation);
}

setInterval(loadDashboard, 30000);
loadDashboard();