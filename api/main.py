from fastapi import FastAPI, Query
from scanner.iam_scanner import scan_iam
from scanner.s3_scanner import scan_s3
from scanner.ec2_scanner import scan_ec2
from scanner.compliance import get_services
from scanner.utils import get_all_regions
from report_generator import generate_pdf

# ============================
# 🌐 FASTAPI SETUP
# ============================
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# ============================
# 🔐 AWS SCAN ENGINE

import boto3
import json
import os
from datetime import datetime, UTC
from concurrent.futures import ThreadPoolExecutor, as_completed

app = FastAPI()



# Static files for frontend

app.mount("/static", StaticFiles(directory="frontend"), name="static")

# 🔐 Get AWS Account ID
def get_account_id():
    sts = boto3.client("sts")
    return sts.get_caller_identity()["Account"]


# 🚀 Main Scan Engine
def run_scan(compliance_mode="BASIC"):

    findings = []
    services = get_services(compliance_mode)

    # 🌍 Get all regions (for report visibility)
    scanned_regions = get_all_regions()

    # 🔥 Parallel Service Scanning
    scan_functions = []

    if "IAM" in services:
        scan_functions.append(scan_iam)

    if "S3" in services:
        scan_functions.append(scan_s3)

    if "EC2" in services:
        scan_functions.append(scan_ec2)

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(func) for func in scan_functions]

        for future in as_completed(futures):
            try:
                findings.extend(future.result())
            except Exception as e:
                print("Scan error:", e)

    # 🔎 Severity Summary
    summary = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0
    }

    for f in findings:
        severity = f.get("severity")
        if severity in summary:
            summary[severity] += 1

    # 🎯 Advanced Risk Scoring
    total_risk = (
        summary["CRITICAL"] * 10 +
        summary["HIGH"] * 6 +
        summary["MEDIUM"] * 3
    )

    normalized_score = max(0, 100 - total_risk)

    # 🧠 Security Level Classification
    if normalized_score > 80:
        security_level = "LOW RISK"
    elif normalized_score > 50:
        security_level = "MODERATE RISK"
    else:
        security_level = "HIGH RISK"

    # 📊 Final Report Structure
    report = {
        "account_id": get_account_id(),
        "scanned_regions": scanned_regions,   # 🔥 Multi-region visibility
        "scan_time": datetime.now(UTC).isoformat(),
        "compliance_mode": compliance_mode,
        "risk_score": normalized_score,
        "security_level": security_level,
        "summary": summary,
        "findings": findings
    }

    # 📁 Save JSON Report
    os.makedirs("reports", exist_ok=True)

    with open("reports/report.json", "w") as file:
        json.dump(report, file, indent=4)

    # 📄 Generate PDF Report
    generate_pdf(report)

    return report


# ============================
# 🌐 FASTAPI ENDPOINTS
# ============================

@app.post("/scan")
def scan(mode: str = Query("BASIC")):
    return run_scan(mode)


@app.get("/report")
def get_report():
    with open("reports/report.json", "r") as file:
        return json.load(file)


@app.get("/summary")
def get_summary():
    with open("reports/report.json", "r") as file:
        report = json.load(file)
        return {
            "summary": report["summary"],
            "risk_score": report["risk_score"],
            "security_level": report["security_level"],
            "compliance_mode": report["compliance_mode"],
            "scanned_regions": report["scanned_regions"]
        }
    

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)