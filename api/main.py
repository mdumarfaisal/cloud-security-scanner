from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
import json
import os

import boto3
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from report_generator import generate_pdf
from scanner.compliance import get_services
from scanner.ec2_scanner import scan_ec2
from scanner.iam_scanner import scan_iam
from scanner.s3_scanner import scan_s3
from scanner.utils import get_all_regions


app = FastAPI()

# Static files for frontend
app.mount("/static", StaticFiles(directory="frontend"), name="static")


class AwsCredentials(BaseModel):
    access_key_id: str = Field(min_length=16)
    secret_access_key: str = Field(min_length=16)
    session_token: str | None = None
    default_region: str = "eu-north-1"


class ScanRequest(BaseModel):
    credentials: AwsCredentials | None = None


def build_session(credentials: AwsCredentials | None):
    if not credentials:
        return boto3.session.Session()

    return boto3.session.Session(
        aws_access_key_id=credentials.access_key_id,
        aws_secret_access_key=credentials.secret_access_key,
        aws_session_token=credentials.session_token,
        region_name=credentials.default_region,
    )


def get_account_id(session):
    sts = session.client("sts")
    return sts.get_caller_identity()["Account"]


def run_scan(compliance_mode="BASIC", session=None):
    active_session = session or boto3.session.Session()

    findings = []
    services = get_services(compliance_mode)

    scanned_regions = get_all_regions(active_session)

    scan_functions = []

    if "IAM" in services:
        scan_functions.append(lambda: scan_iam(active_session))

    if "S3" in services:
        scan_functions.append(lambda: scan_s3(active_session))

    if "EC2" in services:
        scan_functions.append(lambda: scan_ec2(active_session))

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(func) for func in scan_functions]

        for future in as_completed(futures):
            try:
                findings.extend(future.result())
            except Exception as exc:
                print("Scan error:", exc)

    summary = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
    }

    for finding in findings:
        severity = finding.get("severity")
        if severity in summary:
            summary[severity] += 1

    total_risk = (
        summary["CRITICAL"] * 10
        + summary["HIGH"] * 6
        + summary["MEDIUM"] * 3
    )
    normalized_score = max(0, 100 - total_risk)

    if normalized_score > 80:
        security_level = "LOW RISK"
    elif normalized_score > 50:
        security_level = "MODERATE RISK"
    else:
        security_level = "HIGH RISK"

    report = {
        "account_id": get_account_id(active_session),
        "scanned_regions": scanned_regions,
        "scan_time": datetime.now(UTC).isoformat(),
        "compliance_mode": compliance_mode,
        "risk_score": normalized_score,
        "security_level": security_level,
        "summary": summary,
        "findings": findings,
    }

    os.makedirs("reports", exist_ok=True)
    with open("reports/report.json", "w") as file:
        json.dump(report, file, indent=4)

    generate_pdf(report)
    return report


@app.post("/scan")
def scan(request: ScanRequest | None = None, mode: str = Query("BASIC")):
    try:
        credentials = request.credentials if request else None
        session = build_session(credentials)
        return run_scan(mode, session)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Scan failed: {exc}") from exc


@app.post("/auth/aws")
def validate_aws_credentials(request: ScanRequest):
    if not request.credentials:
        raise HTTPException(status_code=400, detail="AWS credentials are required.")

    try:
        session = build_session(request.credentials)
        caller = session.client("sts").get_caller_identity()
        return {
            "ok": True,
            "account_id": caller["Account"],
            "arn": caller["Arn"],
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"AWS authentication failed: {exc}") from exc


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
            "scanned_regions": report["scanned_regions"],
        }


@app.get("/")
def serve_frontend():
    return FileResponse("frontend/index.html")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
