from scanner.iam_scanner import check_admin_policies, check_mfa_enabled

def run_iam_scan():
    findings = []

    findings.extend(check_admin_policies())
    findings.extend(check_mfa_enabled())

    if not findings:
        print("No IAM security issues found.")
    else:
        print("IAM Security Findings:")
        for f in findings:
            print(f"- User: {f['user']}")
            print(f"  Issue: {f['issue']}")
            print(f"  Severity: {f['severity']}")
            print()

if __name__ == "__main__":
    run_iam_scan()