async function loadDashboard() {

    const summaryRes = await fetch("http://localhost:8000/summary");
    const summaryData = await summaryRes.json();

    const reportRes = await fetch("http://localhost:8000/report");
    const reportData = await reportRes.json();

    const summary = summaryData.summary;

    document.getElementById("risk").innerText = summaryData.risk_score;
    document.getElementById("level").innerText = summaryData.security_level;

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