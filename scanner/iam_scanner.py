import boto3
from botocore.exceptions import ClientError
from scanner.utils import create_finding


iam = boto3.client("iam")


# def create_finding(service, resource, issue, severity):
#     return {
#         "service": service,
#         "resource": resource,
#         "issue": issue,
#         "severity": severity
#     }


def scan_iam():
    findings = []

    try:
        paginator = iam.get_paginator("list_users")

        for page in paginator.paginate():
            for user in page["Users"]:
                username = user["UserName"]

                # 🔴 Check AdministratorAccess
                attached = iam.list_attached_user_policies(UserName=username)
                for policy in attached["AttachedPolicies"]:
                    if policy["PolicyName"] == "AdministratorAccess":
                        findings.append(
                            create_finding(
                                "IAM",
                                username,
                                "User has AdministratorAccess policy",
                                "CRITICAL"
                            )
                        )

                # 🟠 Check MFA
                mfa = iam.list_mfa_devices(UserName=username)
                if not mfa["MFADevices"]:
                    findings.append(
                        create_finding(
                            "IAM",
                            username,
                            "User does not have MFA enabled",
                            "HIGH"
                        )
                    )

    except ClientError as e:
        print(f"IAM scan error: {e}")

    return findings