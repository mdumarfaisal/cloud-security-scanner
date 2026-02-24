from scanner.iam_scanner import check_admin_policies, check_mfa_enabled
from scanner.s3_scanner import check_public_buckets
import json
import os

def run_scan():
    findings = []

    findings.extend(check_admin_policies())
    findings.extend(check_mfa_enabled())
    findings.extend(check_public_buckets())

    if not findings:
        print("No security issues found.")
    else:
        print("Security Findings:")
        for f in findings:
            print(f)

    # 🔥 Ensure reports folder exists
    os.makedirs("reports", exist_ok=True)

    # Save JSON report
    with open("reports/report.json", "w") as file:
        json.dump(findings, file, indent=4)

    print("\nReport saved to reports/report.json")

if __name__ == "__main__":
    run_scan()