<!DOCTYPE html>
<html>
<head>
    <title>Cloud Security Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial; margin: 40px; background: #f4f6f9; }
        .card { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
        .risk { font-size: 24px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; border-bottom: 1px solid #ddd; }
        th { background: #222; color: white; }
    </style>
</head>
<body>

<h1>☁️ Cloud Security Dashboard</h1>

<div class="card">
    <div>Total Issues: <span id="total"></span></div>
    <div class="risk">Risk Score: <span id="risk"></span></div>
    <div>Security Level: <span id="level"></span></div>
</div>

<div class="card">
    <canvas id="severityChart"></canvas>
</div>

<div class="card">
    <canvas id="serviceChart"></canvas>
</div>

<div class="card">
    <h3>Findings</h3>
    <table>
        <thead>
            <tr>
                <th>Service</th>
                <th>Resource</th>
                <th>Issue</th>
                <th>Severity</th>
                <th>Region</th>
            </tr>
        </thead>
        <tbody id="findingsTable"></tbody>
    </table>
</div>

<script src="script.js"></script>

</body>
</html>
