import boto3

def get_all_regions():
    ec2 = boto3.client("ec2")
    response = ec2.describe_regions(AllRegions=False)
    return [region["RegionName"] for region in response["Regions"]]



def create_finding(service, resource, issue, severity):
    recommendations = {
        "User has AdministratorAccess policy":
            "Apply least privilege principle. Remove AdministratorAccess and assign granular IAM roles.",
        "User does not have MFA enabled":
            "Enable Multi-Factor Authentication (MFA) for this IAM user.",
        "Bucket has public policy":
            "Remove public access from bucket policy and restrict access via IAM roles.",
        "Bucket is public via ACL":
            "Disable public ACL and enable Block Public Access setting.",
        "Port 22 open to 0.0.0.0/0":
            "Restrict SSH access to specific IP addresses instead of 0.0.0.0/0.",
        "Port 3389 open to 0.0.0.0/0":
            "Restrict RDP access to trusted IP ranges only."
    }

    severity_score = {
        "CRITICAL": 9.5,
        "HIGH": 8.0,
        "MEDIUM": 6.0
    }

    return {
        "service": service,
        "resource": resource,
        "issue": issue,
        "severity": severity,
        "risk_score": severity_score.get(severity, 5),
        "recommendation": recommendations.get(issue, "Review configuration and apply security best practices."),
        "cis_control": "CIS AWS Foundations Benchmark"
    }