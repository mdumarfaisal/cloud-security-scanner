async function loadDashboard() {

    // 🔥 Run scan and get full report
    const res = await fetch("/scan", { method: "POST" });
    const reportData = await res.json();

    const summary = reportData.summary;

    document.getElementById("risk").innerText = reportData.risk_score;
    document.getElementById("level").innerText = reportData.security_level;

    const totalIssues =
        summary.CRITICAL + summary.HIGH + summary.MEDIUM;

    document.getElementById("total").innerText = totalIssues;

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
                data: Object.values(serviceCounts)
            }]
        }
    });

    // 📋 Populate Findings Table
    const table = document.getElementById("findingsTable");
    table.innerHTML = ""; // clear old rows

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

loadDashboard();