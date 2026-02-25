# 🛡️ Automated Cloud Security Configuration Scanner

An automated AWS cloud security configuration scanner built using Python, FastAPI, and boto3.  
This tool scans IAM, S3, and EC2 resources for common security misconfigurations and exposes results through a REST API with analytics-ready output.

---

## 🚀 Project Overview

This project detects common AWS security risks such as:

- IAM users without MFA
- IAM users with AdministratorAccess policy
- Public S3 buckets (policy or ACL)
- EC2 security groups exposing SSH (22) or RDP (3389) to the internet

The scanner aggregates findings, calculates severity distribution, and generates structured JSON reports accessible via API.

---

## 🏗️ Architecture

User (Swagger UI / Future Dashboard)  
↓  
FastAPI Backend  
↓  
Scanner Modules (IAM, S3, EC2)  
↓  
AWS Cloud (via boto3)  
↓  
JSON Report (reports/report.json)

---

## 📂 Project Structure


cloud-security-scanner/
│
├── api/
│ ├── __init__.py
│ └── main.py
│
├── scanner/
│ ├── __init__.py
│ ├── iam_scanner.py
│ ├── s3_scanner.py
│ └── ec2_scanner.py
│
├── reports/
│ └── report.json
│
├── requirements.txt
└── README.md


---

## 🛠️ Tech Stack

- Python 3.13
- FastAPI
- Uvicorn
- boto3
- AWS IAM / S3 / EC2 APIs
- Swagger UI (auto-generated)

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/<your-username>/cloud-security-scanner.git
cd cloud-security-scanner
2️⃣ Install Dependencies
pip install -r requirements.txt

Or manually:

pip install fastapi uvicorn boto3
3️⃣ Configure AWS Credentials

Make sure AWS credentials are configured:

aws configure

Or ensure environment variables are set:

AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION
4️⃣ Run the API Server
python -m uvicorn api.main:app --reload

Server runs at:

http://127.0.0.1:8000

Swagger UI:

http://127.0.0.1:8000/docs
📡 API Endpoints
🔹 POST /scan

Triggers AWS security scan and generates report.

🔹 GET /report

Returns full scan report (account info + findings).

🔹 GET /summary

Returns severity distribution only.

Example response:

{
  "HIGH": 1,
  "CRITICAL": 1
}
🔍 Example Finding
{
  "service": "S3",
  "resource": "example-bucket",
  "issue": "Bucket has public policy",
  "severity": "CRITICAL"
}
📊 Current Capabilities

Detect IAM users without MFA

Detect IAM users with AdministratorAccess

Detect public S3 bucket policy

Detect public S3 bucket ACL

Detect EC2 Security Groups open to 0.0.0.0/0

Generate structured JSON reports

Provide REST API for frontend dashboard integration

🔐 Severity Levels

CRITICAL

HIGH

MEDIUM

LOW (future support)

Severity summary is dynamically calculated during each scan.

🧩 Future Enhancements

React Dashboard with severity analytics

Docker containerization

Kubernetes deployment

Report export (PDF)

Historical scan tracking

Authentication & RBAC

🎯 Use Cases

Cloud security auditing

DevSecOps integration

Internship / academic project

Resume-ready cloud security tool

👨‍💻 Author

Md Umar Faisal
B.Tech – Computer Science and Engineering
Cloud Computing
Cloud Security Project

📜 License

This project is for educational and research purposes.

