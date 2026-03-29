# Cloud Security Scanner

Cloud Security Scanner is a FastAPI-based AWS misconfiguration scanner with a built-in web dashboard.

It scans IAM, S3, and EC2 resources, calculates a risk score, and presents findings with severity and remediation guidance.

## Features

- IAM checks
  - IAM users with `AdministratorAccess`
  - IAM users without MFA
- S3 checks
  - Public bucket policy exposure
  - Public ACL exposure
- EC2 checks
  - Security groups exposing SSH (`22`) to `0.0.0.0/0`
  - Security groups exposing RDP (`3389`) to `0.0.0.0/0`
  - Other public ports
- Dashboard
  - Severity charts
  - Findings table with recommendations
  - Scan history in browser storage
- UI-based AWS login
  - Credentials validated via STS
  - Credentials stored in browser `sessionStorage` (session-only)

## Tech Stack

- Python 3.11
- FastAPI + Uvicorn
- Boto3
- Docker
- Kubernetes (Minikube)
- Vanilla HTML/CSS/JS frontend

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
|  |- compliance.py
|  |- utils.py
|- reports/
|- deployment.yaml
|- service.yaml
|- Dockerfile
|- requirements.txt
|- README.md
```

## How It Works

1. User opens dashboard.
2. User clicks `Connect AWS` and submits credentials.
3. Backend validates credentials using `STS GetCallerIdentity`.
4. User runs scan.
5. Scanner checks IAM/S3/EC2 and returns findings.
6. Report is saved to `reports/report.json` and rendered in UI.

## API Endpoints

- `GET /`
  - Serves frontend
- `POST /auth/aws`
  - Validates AWS credentials from UI
- `POST /scan?mode=BASIC|CIS|STRICT`
  - Runs scan (accepts optional credentials in request body)
- `GET /report`
  - Returns latest full report
- `GET /summary`
  - Returns summary, score, level, mode, regions

Example scan request body:

```json
{
  "credentials": {
    "access_key_id": "AKIA...",
    "secret_access_key": "...",
    "session_token": null,
    "default_region": "eu-north-1"
  }
}
```

## Local Setup

```powershell
cd "D:\COLLEGE 25-26\CLOUD\cloud-security-scanner"
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Open:

- Dashboard: `http://localhost:8000/`
- Swagger: `http://localhost:8000/docs`

## Docker Setup

```powershell
cd "D:\COLLEGE 25-26\CLOUD\cloud-security-scanner"
docker build -t aws-scanner:1.0 .
docker run -p 8000:8000 aws-scanner:1.0
```

Then use `Connect AWS` in the UI.

## Kubernetes Setup (Minikube)

Note: Current deployment is UI-auth based, so `aws-credentials` secret is not required.

```powershell
cd "D:\COLLEGE 25-26\CLOUD\cloud-security-scanner"
minikube start --driver=docker
minikube -p minikube docker-env --shell powershell | Invoke-Expression
docker build -t aws-scanner .
kubectl delete -f deployment.yaml --ignore-not-found
kubectl delete -f service.yaml --ignore-not-found
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl get pods
kubectl get svc
minikube service aws-scanner-service --url
```

Alternative access:

```powershell
kubectl port-forward svc/aws-scanner-service 8000:8000
```

## Verify Self-Healing

```powershell
kubectl get pods
kubectl delete pod <pod-name>
kubectl get pods -w
```

You should see Kubernetes recreate the pod automatically.

## Troubleshooting

- If terminal shows `>>`, press `Ctrl + C` to cancel multiline input.
- If `ImagePullBackOff` appears, make sure image was built in Minikube Docker context:
  - `minikube -p minikube docker-env --shell powershell | Invoke-Expression`
  - Rebuild image.
- If scan fails, reconnect AWS credentials in UI.

## Security Notes

- Do not commit real AWS keys.
- Use temporary credentials (STS) when possible.
- For production, prefer IAM roles (IRSA/EKS role binding) over static keys.
- Add auth/RBAC before exposing publicly.

## Author

Md Umar Faisal
