from fastapi import FastAPI
from scanner.iam_scanner import scan_iam
from scanner.s3_scanner import scan_s3
from scanner.ec2_scanner import scan_ec2
import boto3
import json
import os
from datetime import datetime, UTC

app = FastAPI()


def get_account_id():
    sts = boto3.client("sts")
    return sts.get_caller_identity()["Account"]


def run_scan():
    findings = []
    findings.extend(scan_iam())
    findings.extend(scan_s3())
    findings.extend(scan_ec2())

    summary = {}
    for f in findings:
        severity = f.get("severity", "UNKNOWN")
        summary[severity] = summary.get(severity, 0) + 1

    report = {
        "account_id": get_account_id(),
        "region": boto3.Session().region_name,
        "scan_time": datetime.now(UTC).isoformat(),
        "summary": summary,
        "findings": findings
    }

    os.makedirs("reports", exist_ok=True)
    with open("reports/report.json", "w") as file:
        json.dump(report, file, indent=4)

    return report


@app.post("/scan")
def scan():
    return run_scan()


@app.get("/report")
def get_report():
    with open("reports/report.json", "r") as file:
        return json.load(file)


@app.get("/summary")
def get_summary():
    with open("reports/report.json", "r") as file:
        report = json.load(file)
        return report["summary"]