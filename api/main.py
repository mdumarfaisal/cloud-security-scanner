from scanner.iam_scanner import scan_iam
from scanner.s3_scanner import scan_s3
from scanner.ec2_scanner import scan_ec2

import boto3
import json
import os
from datetime import datetime, UTC



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

    if not findings:
        print("No security issues found.")
    else:
        print("Security Findings:")
        for f in findings:
            print(f)

    os.makedirs("reports", exist_ok=True)

    with open("reports/report.json", "w") as file:
        json.dump(report, file, indent=4)

    print("\nReport saved to reports/report.json")

    return report   # 🔥 Important for API usage later
    
if __name__ == "__main__":   
    run_scan()    