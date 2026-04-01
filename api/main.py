from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
import json
import os

import boto3
from azure.identity import ClientSecretCredential
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from pydantic import BaseModel

from report_generator import generate_pdf
from scanner.azure_scanner import scan_azure
from scanner.compliance import get_services
from scanner.ec2_scanner import scan_ec2
from scanner.gcp_scanner import scan_gcp
from scanner.iam_scanner import scan_iam
from scanner.s3_scanner import scan_s3
from scanner.utils import get_all_regions


SUPPORTED_PROVIDERS = {"AWS", "AZURE", "GCP"}

app = FastAPI()
app.mount("/static", StaticFiles(directory="frontend"), name="static")


class CloudCredentials(BaseModel):
    provider: str = "AWS"
    access_key_id: str | None = None
    secret_access_key: str | None = None
    session_token: str | None = None
    default_region: str = "eu-north-1"
    tenant_id: str | None = None
    client_id: str | None = None
    client_secret: str | None = None
    subscription_id: str | None = None
    project_id: str | None = None
    service_account_json: str | None = None


class ScanRequest(BaseModel):
    credentials: CloudCredentials | None = None


def normalize_provider(provider: str | None):
    return (provider or "AWS").strip().upper()


def build_aws_session(credentials: CloudCredentials | None):
    if not credentials:
        return boto3.session.Session()
    return boto3.session.Session(
        aws_access_key_id=credentials.access_key_id,
        aws_secret_access_key=credentials.secret_access_key,
        aws_session_token=credentials.session_token,
        region_name=credentials.default_region,
    )


def get_aws_account_id(session):
    return session.client("sts").get_caller_identity()["Account"]


def build_report(provider: str, account_id: str, compliance_mode: str, scanned_regions: list[str], findings: list[dict]):
    summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0}
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
        "provider": provider,
        "account_id": account_id,
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


def run_aws_scan(compliance_mode="BASIC", credentials: CloudCredentials | None = None):
    session = build_aws_session(credentials)
    services = get_services(compliance_mode)
    scanned_regions = get_all_regions(session)
    findings = []

    scan_functions = []
    if "IAM" in services:
        scan_functions.append(lambda: scan_iam(session))
    if "S3" in services:
        scan_functions.append(lambda: scan_s3(session))
    if "EC2" in services:
        scan_functions.append(lambda: scan_ec2(session))

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(func) for func in scan_functions]
        for future in as_completed(futures):
            try:
                findings.extend(future.result())
            except Exception as exc:
                print("AWS scan error:", exc)

    return build_report(
        provider="AWS",
        account_id=get_aws_account_id(session),
        compliance_mode=compliance_mode,
        scanned_regions=scanned_regions,
        findings=findings,
    )


def run_azure_scan(credentials: CloudCredentials):
    findings = scan_azure(
        tenant_id=credentials.tenant_id or "",
        client_id=credentials.client_id or "",
        client_secret=credentials.client_secret or "",
        subscription_id=credentials.subscription_id or "",
    )
    return build_report(
        provider="AZURE",
        account_id=credentials.subscription_id or "unknown-subscription",
        compliance_mode="BASIC",
        scanned_regions=sorted({f.get("region", "-") for f in findings if f.get("region")}),
        findings=findings,
    )


def run_gcp_scan(credentials: CloudCredentials):
    findings = scan_gcp(
        project_id=credentials.project_id or "",
        service_account_json=credentials.service_account_json or "",
    )
    return build_report(
        provider="GCP",
        account_id=credentials.project_id or "unknown-project",
        compliance_mode="BASIC",
        scanned_regions=sorted({f.get("region", "-") for f in findings if f.get("region")}),
        findings=findings,
    )


@app.post("/auth/cloud")
def validate_cloud_credentials(request: ScanRequest):
    if not request.credentials:
        raise HTTPException(status_code=400, detail="Credentials are required.")

    credentials = request.credentials
    provider = normalize_provider(credentials.provider)
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    if provider == "AWS":
        if not credentials.access_key_id or not credentials.secret_access_key:
            raise HTTPException(status_code=400, detail="AWS access key and secret key are required.")
        try:
            session = build_aws_session(credentials)
            caller = session.client("sts").get_caller_identity()
            return {
                "ok": True,
                "provider": "AWS",
                "account_id": caller["Account"],
                "principal": caller["Arn"],
            }
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"AWS authentication failed: {exc}") from exc

    if provider == "AZURE":
        required = [credentials.tenant_id, credentials.client_id, credentials.client_secret, credentials.subscription_id]
        if not all(required):
            raise HTTPException(status_code=400, detail="Azure tenant ID, client ID, client secret, and subscription ID are required.")
        try:
            azure_credential = ClientSecretCredential(
                tenant_id=credentials.tenant_id,
                client_id=credentials.client_id,
                client_secret=credentials.client_secret,
            )
            azure_credential.get_token("https://management.azure.com/.default")
            return {
                "ok": True,
                "provider": "AZURE",
                "account_id": credentials.subscription_id,
                "principal": credentials.client_id,
            }
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Azure authentication failed: {exc}") from exc

    if not credentials.project_id or not credentials.service_account_json:
        raise HTTPException(status_code=400, detail="GCP project ID and service account JSON are required.")

    try:
        info = json.loads(credentials.service_account_json)
        gcp_creds = service_account.Credentials.from_service_account_info(
            info,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        gcp_creds.refresh(Request())
        return {
            "ok": True,
            "provider": "GCP",
            "account_id": credentials.project_id,
            "principal": info.get("client_email", "service-account"),
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"GCP authentication failed: {exc}") from exc


@app.post("/scan")
def scan(request: ScanRequest | None = None, mode: str = Query("BASIC")):
    credentials = request.credentials if request else None
    provider = normalize_provider(credentials.provider if credentials else "AWS")

    try:
        if provider == "AWS":
            return run_aws_scan(mode, credentials)
        if provider == "AZURE":
            if not credentials:
                raise HTTPException(status_code=400, detail="Azure credentials are required.")
            return run_azure_scan(credentials)
        if provider == "GCP":
            if not credentials:
                raise HTTPException(status_code=400, detail="GCP credentials are required.")
            return run_gcp_scan(credentials)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"{provider} scan failed: {exc}") from exc

    raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")


@app.get("/report")
def get_report():
    with open("reports/report.json", "r") as file:
        return json.load(file)


@app.get("/summary")
def get_summary():
    with open("reports/report.json", "r") as file:
        report = json.load(file)
    return {
        "provider": report.get("provider", "AWS"),
        "summary": report["summary"],
        "risk_score": report["risk_score"],
        "security_level": report["security_level"],
        "compliance_mode": report.get("compliance_mode", "BASIC"),
        "scanned_regions": report.get("scanned_regions", []),
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
