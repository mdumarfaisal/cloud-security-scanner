from fastapi import FastAPI, Query
from scanner.iam_scanner import scan_iam
from scanner.s3_scanner import scan_s3
from scanner.ec2_scanner import scan_ec2
import boto3
import json
import os
from datetime import datetime, UTC

from scanner.compliance import get_services
from report_generator import generate_pdf

app = FastAPI()


def get_account_id():
    sts = boto3.client("sts")
    return sts.get_caller_identity()["Account"]


def run_scan(compliance_mode="BASIC"):

    findings = []

    services = get_services(compliance_mode)

    if "IAM" in services:
        findings.extend(scan_iam())

    if "S3" in services:
        findings.extend(scan_s3())

    if "EC2" in services:
        findings.extend(scan_ec2())

    # 🔎 Fixed Summary Structure
    summary = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0
    }

    for f in findings:
        severity = f.get("severity")
        if severity in summary:
            summary[severity] += 1

    # 🎯 Weighted Risk Scoring
    risk_score = (
        summary["CRITICAL"] * 5 +
        summary["HIGH"] * 3 +
        summary["MEDIUM"] * 1
    )

    normalized_score = max(0, 100 - risk_score)

    report = {
        "account_id": get_account_id(),
        "region": boto3.Session().region_name,
        "scan_time": datetime.now(UTC).isoformat(),
        "compliance_mode": compliance_mode,
        "risk_score": normalized_score,
        "summary": summary,
        "findings": findings
    }

    os.makedirs("reports", exist_ok=True)

    with open("reports/report.json", "w") as file:
        json.dump(report, file, indent=4)

    generate_pdf(report)

    return report

# @app.post("/scan")
# def scan():
#     return run_scan()


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
            "compliance_mode": report["compliance_mode"]
        }