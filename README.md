☁️ Cloud-Native AWS Security Scanner

A cloud-native AWS security configuration scanner built using Python, FastAPI, Docker, and Kubernetes.

This tool programmatically audits AWS resources (IAM, S3, EC2) for common security misconfigurations and exposes structured findings through a REST API.

Designed as a DevSecOps-ready, containerized cloud security project.

🚀 Features
🔍 IAM Security Checks

Detects users attached to AdministratorAccess

Detects IAM users without MFA enabled

🪣 S3 Security Checks

Detects public bucket policies

Detects public bucket ACLs

🖥 EC2 Security Checks

Detects security groups exposing:

SSH (Port 22) to 0.0.0.0/0

RDP (Port 3389) to 0.0.0.0/0

📊 Severity Classification

Each finding is categorized as:

CRITICAL

HIGH

MEDIUM

Severity summary is dynamically calculated during each scan.

🌐 REST API

Built using FastAPI

Auto-generated Swagger documentation

JSON analytics-ready output

🐳 Cloud-Native Deployment

Dockerized application

Kubernetes deployment (Minikube tested)

Self-healing verified

Service exposure validated

🏗 Architecture
FastAPI Application
        ↓
Docker Container
        ↓
Kubernetes Deployment
        ↓
Pod
        ↓
Service (NodePort / Port-Forward)
        ↓
AWS APIs (IAM, S3, EC2 via boto3)
🛠 Tech Stack

Python 3.11

FastAPI

Uvicorn

Boto3 (AWS SDK)

Docker

Kubernetes (Minikube)

📦 Project Structure
cloud-security-scanner/
│
├── api/
│   └── main.py
│
├── scanner/
│   ├── iam_scanner.py
│   ├── s3_scanner.py
│   └── ec2_scanner.py
│
├── deployment.yaml
├── service.yaml
├── Dockerfile
├── requirements.txt
└── README.md
🔧 Local Setup
1️⃣ Install Dependencies
pip install -r requirements.txt
2️⃣ Configure AWS Credentials
export AWS_ACCESS_KEY_ID=YOUR_KEY
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET
export AWS_DEFAULT_REGION=eu-north-1

Or use:

aws configure
3️⃣ Run Application
uvicorn api.main:app --host 0.0.0.0 --port 8000

Access Swagger UI:

http://localhost:8000/docs
🐳 Docker Setup
Build Image
docker build -t aws-scanner:1.0 .
Run Container
docker run -p 8000:8000 \
-e AWS_ACCESS_KEY_ID=YOUR_KEY \
-e AWS_SECRET_ACCESS_KEY=YOUR_SECRET \
-e AWS_DEFAULT_REGION=eu-north-1 \
aws-scanner:1.0
☸️ Kubernetes Deployment (Minikube)
Start Minikube
minikube start
Load Image
minikube image load aws-scanner:1.0
Deploy
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
Verify
kubectl get pods
kubectl get svc
Access via Port Forward
kubectl port-forward svc/aws-scanner-service 8000:8000

Open:

http://localhost:8000/docs
🔎 API Endpoints
GET /

Health check endpoint.

GET /scan

Runs full AWS security scan and returns:

{
  "account_id": "123456789012",
  "region": "eu-north-1",
  "summary": {
    "CRITICAL": 1,
    "HIGH": 2,
    "MEDIUM": 0
  },
  "findings": [...]
}
🔁 Kubernetes Validation

Pod health verified

Logs inspected

API tested inside cluster

Manual pod deletion → automatic recreation confirmed

Service exposure validated

Confirms Kubernetes self-healing behavior.

🔐 Security Note

For demonstration, AWS credentials were passed via environment variables.

In production:

Use Kubernetes Secrets

Prefer IAM Roles over static access keys

Add authentication & RBAC

Enable logging & monitoring

🎯 Learning Outcomes

Cloud-native architecture design

Docker containerization

Kubernetes Deployment & Service configuration

AWS SDK (Boto3) integration

REST API development with FastAPI

DevSecOps fundamentals

Kubernetes self-healing validation

📌 Future Improvements

Add RDS & Lambda scanning

Add authentication layer (JWT)

Add React dashboard

Deploy to AWS EKS

CI/CD integration

Historical scan tracking

Replace static keys with IAM Roles

👨‍💻 Author

Md Umar Faisal
B.Tech – Computer Science and Engineering
Cloud Computing Project