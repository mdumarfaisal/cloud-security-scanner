import boto3

iam = boto3.client('iam')

def check_admin_policies():
    findings = []

    users = iam.list_users()['Users']

    for user in users:
        username = user['UserName']

        attached_policies = iam.list_attached_user_policies(UserName=username)

        for policy in attached_policies['AttachedPolicies']:
            if policy['PolicyName'] == "AdministratorAccess":
                findings.append({
                    "user": username,
                    "issue": "User has AdministratorAccess policy",
                    "severity": "HIGH"
                })

    return findings


def check_mfa_enabled():
    findings = []

    users = iam.list_users()['Users']

    for user in users:
        username = user['UserName']

        mfa_devices = iam.list_mfa_devices(UserName=username)

        if len(mfa_devices['MFADevices']) == 0:
            findings.append({
                "user": username,
                "issue": "User does not have MFA enabled",
                "severity": "MEDIUM"
            })

    return findings