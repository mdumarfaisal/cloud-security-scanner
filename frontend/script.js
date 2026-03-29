let scanHistory = JSON.parse(localStorage.getItem("scanHistory")) || [];
let severityChart = null;
let serviceChart = null;
let awsCredentials = JSON.parse(sessionStorage.getItem("awsCredentials") || "null");

function showDashboard() {
    toggleSection("dashboard");
    loadDashboard();
}

function showHistory() {
    toggleSection("history");
    loadHistory();
}

function toggleSection(section) {
    const isDashboard = section === "dashboard";

    document.getElementById("dashboardSection").classList.toggle("hidden", !isDashboard);
    document.getElementById("historySection").classList.toggle("hidden", isDashboard);

    document.getElementById("navDashboard").classList.toggle("active", isDashboard);
    document.getElementById("navHistory").classList.toggle("active", !isDashboard);
    document.getElementById("mobileNavDashboard").classList.toggle("active", isDashboard);
    document.getElementById("mobileNavHistory").classList.toggle("active", !isDashboard);
}

async function triggerScan() {
    try {
        if (!awsCredentials) {
            alert("Connect AWS credentials before starting a scan.");
            openAwsModal();
            return;
        }

        setStatus("Scanning", "loading", true);

        const response = await fetch("/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credentials: awsCredentials })
        });
        if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}));
            throw new Error(errorPayload.detail || "Scan failed");
        }

        const data = await response.json();
        const cisScore = calculateCISScore(data.summary);

        updateHistory(data, cisScore);
        renderDashboard(data, cisScore);
        setStatus("Live", "live", false);
    } catch (error) {
        console.error(error);
        setStatus("Scan Failed", "error", false);
        alert(error.message || "Scan failed. Please try again.");
    }
}

function setStatus(text, variant, loading) {
    const loader = document.getElementById("loader");
    const indicator = document.getElementById("statusIndicator");

    loader.classList.toggle("hidden", !loading);
    indicator.className = `status-pill status-${variant}`;
    indicator.textContent = text;
}

function calculateCISScore(summary) {
    const penalty =
        (summary.CRITICAL * 10) +
        (summary.HIGH * 6) +
        (summary.MEDIUM * 3);

    return Math.max(0, 100 - penalty);
}

async function loadDashboard() {
    try {
        const response = await fetch("/report");
        if (!response.ok) {
            throw new Error("Report fetch failed");
        }

        const data = await response.json();
        const cisScore = calculateCISScore(data.summary);
        renderDashboard(data, cisScore);
        setStatus("Live", "live", false);
    } catch (error) {
        console.error(error);
        setStatus("Unavailable", "error", false);
    }
}

function renderDashboard(data, cisScore) {
    animateValue("risk", data.risk_score);
    animateValue("cisScore", cisScore);

    document.getElementById("total").textContent =
        data.summary.CRITICAL + data.summary.HIGH + data.summary.MEDIUM;

    document.getElementById("level").textContent = data.security_level || "-";
    document.getElementById("lastScan").textContent = formatTimestamp(data.scan_time);

    colorSecurityCard(data.security_level);
    updateCharts(data);
    updateCISBreakdown(data.summary);
    populateTable(data);
}

function colorSecurityCard(level) {
    const card = document.getElementById("securityCard");
    card.classList.remove("level-low", "level-moderate", "level-high");

    const map = {
        "LOW RISK": "level-low",
        "MODERATE RISK": "level-moderate",
        "HIGH RISK": "level-high"
    };

    if (map[level]) {
        card.classList.add(map[level]);
    }
}

function updateCharts(data) {
    if (severityChart) {
        severityChart.destroy();
    }

    if (serviceChart) {
        serviceChart.destroy();
    }

    severityChart = new Chart(document.getElementById("severityChart"), {
        type: "doughnut",
        data: {
            labels: ["Critical", "High", "Medium"],
            datasets: [{
                data: [
                    data.summary.CRITICAL,
                    data.summary.HIGH,
                    data.summary.MEDIUM
                ],
                backgroundColor: ["#d84b53", "#d97a18", "#3c78d8"],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            cutout: "68%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        padding: 18
                    }
                }
            }
        }
    });

    const serviceCounts = {};
    data.findings.forEach((finding) => {
        const key = finding.service || "Unknown";
        serviceCounts[key] = (serviceCounts[key] || 0) + 1;
    });

    const labels = Object.keys(serviceCounts);
    const values = Object.values(serviceCounts);

    serviceChart = new Chart(document.getElementById("serviceChart"), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Issues per service",
                data: values,
                borderRadius: 10,
                backgroundColor: "#1f8fff",
                maxBarThickness: 42
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function updateCISBreakdown(summary) {
    const container = document.getElementById("cisBreakdown");
    container.innerHTML = "";

    const controls = [
        { name: "S3 Exposure", issues: summary.CRITICAL, weight: 12 },
        { name: "IAM Hygiene", issues: summary.HIGH, weight: 9 },
        { name: "EC2 Hardening", issues: summary.MEDIUM, weight: 6 }
    ];

    controls.forEach((control) => {
        const score = Math.max(0, 100 - (control.issues * control.weight));
        const tone =
            score >= 80 ? "#1e9e69" :
            score >= 55 ? "#d97a18" :
                "#d84b53";

        const wrapper = document.createElement("div");
        wrapper.className = "progress-wrapper";
        wrapper.innerHTML = `
            <div class="progress-meta">
                <div>
                    <strong>${control.name}</strong>
                    <div>${control.issues} issue${control.issues === 1 ? "" : "s"} influencing this area</div>
                </div>
                <strong>${score}%</strong>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${score}%; background:${tone};"></div>
            </div>
        `;

        container.appendChild(wrapper);
    });
}

function populateTable(data) {
    const severityFilter = document.getElementById("severityFilter").value;
    const searchText = document.getElementById("searchInput").value.trim().toLowerCase();
    const table = document.getElementById("findingsTable");

    table.innerHTML = "";

    const filtered = data.findings.filter((finding) => {
        const matchesSeverity = !severityFilter || finding.severity === severityFilter;
        const haystack = `${finding.resource || ""} ${finding.issue || ""} ${finding.service || ""}`.toLowerCase();
        const matchesSearch = !searchText || haystack.includes(searchText);
        return matchesSeverity && matchesSearch;
    });

    if (!filtered.length) {
        table.innerHTML = `
            <tr class="empty-state">
                <td colspan="6">
                    <span class="empty-title">No findings match the current filters</span>
                    Try another severity level or a broader search term.
                </td>
            </tr>
        `;
        return;
    }

    const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    filtered
        .sort((a, b) => {
            const severityDiff = (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99);
            if (severityDiff !== 0) {
                return severityDiff;
            }

            return (a.service || "").localeCompare(b.service || "");
        })
        .forEach((finding) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${escapeHtml(finding.service || "-")}</td>
                <td class="resource-cell"><span class="truncate" title="${escapeAttribute(finding.resource || "-")}">${escapeHtml(finding.resource || "-")}</span></td>
                <td class="issue-cell"><span class="truncate" title="${escapeAttribute(finding.issue || "-")}">${escapeHtml(finding.issue || "-")}</span></td>
                <td>${getSeverityBadge(finding.severity)}</td>
                <td>${escapeHtml(finding.region || "-")}</td>
                <td>
                    <button class="view-btn" type="button" data-recommendation="${encodeURIComponent(finding.recommendation || "No recommendation provided.")}">
                        View
                    </button>
                </td>
            `;

            table.appendChild(row);
        });
}

function getSeverityBadge(severity) {
    const variant = (severity || "").toLowerCase();
    return `<span class="severity-badge severity-${variant}">${escapeHtml(severity || "Unknown")}</span>`;
}

function updateHistory(data, cisScore) {
    scanHistory.unshift({
        time: data.scan_time,
        score: data.risk_score,
        cis: cisScore,
        level: data.security_level
    });

    scanHistory = scanHistory.slice(0, 10);
    localStorage.setItem("scanHistory", JSON.stringify(scanHistory));
    loadHistory();
}

function loadHistory() {
    const table = document.getElementById("historyTable");
    table.innerHTML = "";

    if (!scanHistory.length) {
        table.innerHTML = `
            <tr class="empty-state">
                <td colspan="4">
                    <span class="empty-title">No scan history yet</span>
                    Run a scan to start building a recent posture timeline.
                </td>
            </tr>
        `;
        return;
    }

    scanHistory.forEach((historyItem) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${formatTimestamp(historyItem.time)}</td>
            <td>${historyItem.score}</td>
            <td>${historyItem.cis}</td>
            <td>${escapeHtml(historyItem.level || "-")}</td>
        `;
        table.appendChild(row);
    });
}

function animateValue(id, end, duration = 800) {
    const element = document.getElementById(id);
    const target = Number(end) || 0;
    const start = Number(element.textContent) || 0;
    const difference = target - start;
    let startTime = null;

    function step(currentTime) {
        if (!startTime) {
            startTime = currentTime;
        }

        const progress = Math.min((currentTime - startTime) / duration, 1);
        const value = Math.round(start + (difference * progress));
        element.textContent = value;

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

function showRecommendation(text) {
    if (!text) {
        return;
    }

    const modal = document.getElementById("recommendationModal");
    document.getElementById("modalText").textContent = text;
    modal.classList.add("show");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
    const modal = document.getElementById("recommendationModal");
    modal.classList.remove("show");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

function openAwsModal() {
    const modal = document.getElementById("awsModal");
    const message = document.getElementById("awsAuthMessage");

    if (awsCredentials) {
        document.getElementById("awsAccessKeyId").value = awsCredentials.access_key_id || "";
        document.getElementById("awsSecretAccessKey").value = awsCredentials.secret_access_key || "";
        document.getElementById("awsSessionToken").value = awsCredentials.session_token || "";
        document.getElementById("awsDefaultRegion").value = awsCredentials.default_region || "eu-north-1";
    }

    message.textContent = "";
    message.className = "aws-auth-message";
    modal.classList.add("show");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function closeAwsModal() {
    const modal = document.getElementById("awsModal");
    modal.classList.remove("show");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

function setAwsConnectionStatus(text) {
    document.getElementById("awsConnectionStatus").textContent = text;
}

async function saveAwsCredentials(event) {
    event.preventDefault();

    const payload = {
        credentials: {
            access_key_id: document.getElementById("awsAccessKeyId").value.trim(),
            secret_access_key: document.getElementById("awsSecretAccessKey").value.trim(),
            session_token: document.getElementById("awsSessionToken").value.trim() || null,
            default_region: document.getElementById("awsDefaultRegion").value.trim() || "eu-north-1"
        }
    };

    const message = document.getElementById("awsAuthMessage");
    message.textContent = "Validating credentials...";
    message.className = "aws-auth-message";

    try {
        const response = await fetch("/auth/aws", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}));
            throw new Error(errorPayload.detail || "Authentication failed");
        }

        const data = await response.json();
        awsCredentials = payload.credentials;
        sessionStorage.setItem("awsCredentials", JSON.stringify(awsCredentials));

        message.textContent = `Connected to account ${data.account_id}`;
        message.className = "aws-auth-message success";
        setAwsConnectionStatus(`Connected (${data.account_id})`);

        setTimeout(() => {
            closeAwsModal();
        }, 500);
    } catch (error) {
        console.error(error);
        message.textContent = error.message || "Authentication failed.";
        message.className = "aws-auth-message error";
        setAwsConnectionStatus("Not connected");
    }
}

function formatTimestamp(value) {
    if (!value) {
        return "Waiting for data";
    }

    return new Date(value).toLocaleString();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#96;");
}

document.getElementById("findingsTable").addEventListener("click", (event) => {
    if (event.target.classList.contains("view-btn")) {
        const text = decodeURIComponent(event.target.dataset.recommendation || "");
        showRecommendation(text);
    }
});

document.getElementById("recommendationModal").addEventListener("click", (event) => {
    if (event.target.id === "recommendationModal") {
        closeModal();
    }
});

document.getElementById("awsModal").addEventListener("click", (event) => {
    if (event.target.id === "awsModal") {
        closeAwsModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeModal();
        closeAwsModal();
    }
});

if (awsCredentials) {
    setAwsConnectionStatus("Connected");
}

loadHistory();
loadDashboard();
setInterval(loadDashboard, 30000);
