# Cloud Security Scanner

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Minikube-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Cloud](https://img.shields.io/badge/Multi--Cloud-AWS%20%7C%20Azure%20%7C%20GCP-2E7D32)](#key-features)

Cloud Security Scanner is a cloud misconfiguration scanner with a FastAPI backend and web dashboard.

It currently supports AWS, Azure, and GCP checks, assigns severity-based findings, calculates a weighted risk score, and stores scan reports as JSON and PDF.

## Table of Contents

- [Why This Project](#why-this-project)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start (2 Minutes)](#quick-start-2-minutes)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment (Minikube)](#kubernetes-deployment-minikube)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Operational Validation](#operational-validation)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Why This Project

Cloud incidents are often caused by configuration drift and overly permissive access, not only software CVEs. This project demonstrates a practical DevSecOps workflow with:

- Automated cloud posture checks
- API-first backend design
- Cloud-native packaging and orchestration
- A dashboard for security visibility and triage

## Key Features

### Multi-Cloud Security Checks

AWS:
- IAM
  - Detect users with `AdministratorAccess`
  - Detect users without MFA
- S3
  - Detect public bucket policies
  - Detect public ACL exposure
- EC2
  - Detect security groups exposing SSH (`22`) to `0.0.0.0/0`
  - Detect security groups exposing RDP (`3389`) to `0.0.0.0/0`
  - Detect other world-exposed inbound ports

Azure:
- NSG
  - Detect public inbound rules for SSH (`22`)
  - Detect public inbound rules for RDP (`3389`)
  - Detect other public inbound rules
- Storage Accounts
  - Detect `allow_blob_public_access = true`

GCP:
- VPC Firewall
  - Detect ingress rules exposing SSH (`22`)
  - Detect ingress rules exposing RDP (`3389`)
  - Detect other public ingress rules
- Cloud Storage
  - Detect bucket IAM bindings with `allUsers` / `allAuthenticatedUsers`

### Risk and Reporting

- Severity levels: `CRITICAL`, `HIGH`, `MEDIUM`
- Finding-level fields include:
  - `provider`, `service`, `resource`, `issue`, `severity`, `region`
  - `risk_score`, `recommendation`, `cis_control`
- Weighted posture score:
  - `Risk Score = 100 - (CRITICAL * 10 + HIGH * 6 + MEDIUM * 3)`
- Security classification:
  - `LOW RISK` (>80), `MODERATE RISK` (>50), `HIGH RISK` (<=50)
- JSON report persisted to `reports/report.json`
- PDF report persisted to `reports/security_report.pdf`

### Dashboard Features

- Cloud credential connect flow (`Connect Cloud`)
- Provider-specific credential validation (`AWS`, `AZURE`, `GCP`)
- Severity and service charts
- Searchable and filterable findings table
- Recommendation modal per finding
- In-browser scan history (`localStorage`, last 10 entries)
- Automatic dashboard refresh every 30 seconds

## Architecture

```text
Browser Dashboard
   -> FastAPI API (api/main.py)
      -> Provider auth validation (/auth/cloud)
      -> Scan trigger (/scan)
         -> AWS (IAM, S3, EC2) OR Azure (NSG, Storage) OR GCP (Firewall, Storage)
            -> Report JSON + PDF
               -> Dashboard rendering (/report, /summary)
```

## Project Structure

```text
cloud-security-scanner/
|- api/
|  |- main.py
|- frontend/
|  |- index.html
|  |- script.js
|  |- style.css
|- scanner/
|  |- iam_scanner.py
|  |- s3_scanner.py
|  |- ec2_scanner.py
|  |- azure_scanner.py
|  |- gcp_scanner.py
|  |- compliance.py
|  |- rules.py
|  |- utils.py
|- reports/
|- report_generator.py
|- deployment.yaml
|- service.yaml
|- Dockerfile
|- requirements.txt
|- README.md
```

## Quick Start (2 Minutes)

```powershell
cd "D:\COLLEGE 25-26\CLOUD\cloud-security-scanner"
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Open:

- Dashboard: `http://localhost:8000/`
- Swagger UI: `http://localhost:8000/docs`

Then in UI:

1. Click `Connect Cloud`
2. Select provider and enter credentials
3. Click `Run New Scan`

## Local Development

### Prerequisites

- Python 3.11+
- One of:
  - AWS credentials with read permissions for IAM/S3/EC2
  - Azure app credentials with access to NSG/Storage metadata
  - GCP service account JSON with permissions for firewall and storage IAM inspection

### Run

```powershell
cd "D:\COLLEGE 25-26\CLOUD\cloud-security-scanner"
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

## Docker Deployment

```powershell
cd "D:\COLLEGE 25-26\CLOUD\cloud-security-scanner"
docker build -t aws-scanner:1.0 .
docker run -p 8000:8000 aws-scanner:1.0
```

Open http://localhost:8000/ and use Connect AWS.

## Kubernetes Deployment (Minikube)

Current Kubernetes config is UI-auth based. No aws-credentials secret is required.

```powershell
cd "D:\COLLEGE 25-26\CLOUD\cloud-security-scanner"
minikube start --driver=docker
minikube -p minikube docker-env --shell powershell | Invoke-Expression
docker build -t aws-scanner .
kubectl delete -f deployment.yaml --ignore-not-found
kubectl delete -f service.yaml --ignore-not-found
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl get deployments
kubectl get pods
kubectl get svc
minikube service aws-scanner-service --url
```

Alternative access:

```powershell
kubectl port-forward svc/aws-scanner-service 8000:8000
```

## API Reference

### `GET /`
Serves frontend dashboard (`frontend/index.html`).

### `POST /auth/cloud`
Validates submitted cloud credentials for `AWS`, `AZURE`, or `GCP`.

Request body shape:

```json
{
  "credentials": {
    "provider": "AWS",
    "access_key_id": "AKIA...",
    "secret_access_key": "...",
    "session_token": null,
    "default_region": "eu-north-1",
    "tenant_id": null,
    "client_id": null,
    "client_secret": null,
    "subscription_id": null,
    "project_id": null,
    "service_account_json": null
  }
}
```

Provider-specific required fields:

- AWS: `access_key_id`, `secret_access_key`
- AZURE: `tenant_id`, `client_id`, `client_secret`, `subscription_id`
- GCP: `project_id`, `service_account_json`

### `POST /scan?mode=BASIC|CIS|STRICT`
Runs a scan and returns the full report payload.

- AWS:
  - `BASIC` -> IAM + S3
  - `CIS` / `STRICT` -> IAM + S3 + EC2
- AZURE / GCP:
  - Current implementation scans provider checks in basic mode semantics
  - `mode` is accepted but does not change scan scope

Request body:

```json
{
  "credentials": {
    "provider": "AZURE"
  }
}
```

If no body is provided, API defaults to AWS scan using default SDK session resolution.

### `GET /report`
Returns the latest full report from `reports/report.json`.

### `GET /summary`
Returns summarized report data:

- `provider`
- `summary`
- `risk_score`
- `security_level`
- `compliance_mode`
- `scanned_regions`

## Security Model

### Current

- Credentials entered via dashboard modal
- Backend validates credentials per provider before scan
- Frontend stores cloud credentials in browser `sessionStorage` (session scope)
- Frontend stores recent scan history in browser `localStorage`
- API CORS is currently open (`allow_origins=["*"]`)

### Recommended for Production

- Use role-based or workload identity auth over long-lived keys
- Add API/UI authentication and RBAC
- Enforce HTTPS and secure secret handling
- Add structured audit logging and monitoring
- Restrict CORS and network exposure

## Operational Validation

### Kubernetes self-healing check

```powershell
kubectl get pods
kubectl delete pod <pod-name>
kubectl get pods -w
```

Expected: deployment recreates pod automatically.

## Troubleshooting

- If terminal shows `>>`, press `Ctrl + C` to cancel multiline input.
- If `ImagePullBackOff` occurs:
  - Re-run: `minikube -p minikube docker-env --shell powershell | Invoke-Expression`
  - Rebuild image.
- If auth fails:
  - Reconnect from `Connect Cloud`
  - Verify required fields for selected provider
- If scans fail:
  - Check cloud account read permissions for the scanned services
  - Verify region/subscription/project scope is correct

## Roadmap

- Add more service checks (for example RDS, Lambda, Key Vault, Cloud SQL)
- Add trend analytics and report comparison
- Add auth layer (JWT/OAuth)
- Add CI/CD security gates and automated tests
- Deploy to managed Kubernetes platforms

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make changes with tests/docs updates
4. Open a pull request

## License

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.

## Author

Md Umar Faisal
