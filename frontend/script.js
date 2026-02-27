async function triggerScan() {
    await fetch("/scan", { method: "POST" });
    loadDashboard();
}

async function loadDashboard() {

    const reportRes = await fetch("/report");
    const reportData = await reportRes.json();

    const summary = reportData.summary;

    document.getElementById("risk").innerText = reportData.risk_score;
    document.getElementById("level").innerText = reportData.security_level;

    const totalIssues =
        summary.CRITICAL + summary.HIGH + summary.MEDIUM;

    document.getElementById("total").innerText = totalIssues;

    // 🔥 Risk Bar
    const riskBar = document.getElementById("riskBar");
    riskBar.style.width = reportData.risk_score + "%";

    if (reportData.risk_score > 80) {
        riskBar.style.background = "#2ecc71";
    } else if (reportData.risk_score > 50) {
        riskBar.style.background = "#f39c12";
    } else {
        riskBar.style.background = "#e74c3c";
    }

    // 🔴 Severity Pie Chart
    new Chart(document.getElementById("severityChart"), {
        type: "pie",
        data: {
            labels: ["CRITICAL", "HIGH", "MEDIUM"],
            datasets: [{
                data: [
                    summary.CRITICAL,
                    summary.HIGH,
                    summary.MEDIUM
                ],
                backgroundColor: [
                    "#e74c3c",
                    "#f39c12",
                    "#3498db"
                ]
            }]
        }
    });

    // 🟢 Service-wise Distribution
    const serviceCounts = {};

    reportData.findings.forEach(f => {
        serviceCounts[f.service] =
            (serviceCounts[f.service] || 0) + 1;
    });

    new Chart(document.getElementById("serviceChart"), {
        type: "bar",
        data: {
            labels: Object.keys(serviceCounts),
            datasets: [{
                label: "Issues per Service",
                data: Object.values(serviceCounts),
                backgroundColor: "#3498db"
            }]
        }
    });

    // 📋 Populate Findings Table
    const table = document.getElementById("findingsTable");
    table.innerHTML = "";

    reportData.findings.forEach(f => {
        const row = `
            <tr>
                <td>${f.service}</td>
                <td>${f.resource}</td>
                <td>${f.issue}</td>
                <td>${f.severity}</td>
                <td>${f.region || "-"}</td>
            </tr>
        `;
        table.innerHTML += row;
    });
}

// Load dashboard initially
loadDashboard();

// Auto refresh every 30 seconds
setInterval(loadDashboard, 30000);