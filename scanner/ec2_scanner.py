import boto3
from botocore.exceptions import ClientError
from scanner.utils import get_all_regions



ec2 = boto3.client("ec2")


def create_finding(service, resource, issue, severity):
    return {
        "service": service,
        "resource": resource,
        "issue": issue,
        "severity": severity
    }


def scan_ec2():
    findings = []
    regions = get_all_regions()

    for region in regions:
        ec2 = boto3.client("ec2", region_name=region)

        try:
            security_groups = ec2.describe_security_groups()["SecurityGroups"]

            for sg in security_groups:
                sg_id = sg["GroupId"]

                for permission in sg.get("IpPermissions", []):
                    for ip_range in permission.get("IpRanges", []):
                        if ip_range.get("CidrIp") == "0.0.0.0/0":
                            findings.append({
                                "service": "EC2",
                                "resource": sg_id,
                                "issue": f"Open to world in {region}",
                                "severity": "HIGH"
                            })

        except Exception:
            continue

    return findings             
    findings = []   

    try:
        security_groups = ec2.describe_security_groups()["SecurityGroups"]

        for sg in security_groups:
            sg_id = sg["GroupId"]

            for permission in sg.get("IpPermissions", []):
                from_port = permission.get("FromPort")
                to_port = permission.get("ToPort")

                for ip_range in permission.get("IpRanges", []):
                    cidr = ip_range.get("CidrIp")

                    if cidr == "0.0.0.0/0":

                        if from_port == 22:
                            findings.append(
                                create_finding(
                                    "EC2",
                                    sg_id,
                                    "Port 22 open to 0.0.0.0/0",
                                    "HIGH"
                                )
                            )

                        if from_port == 3389:
                            findings.append(
                                create_finding(
                                    "EC2",
                                    sg_id,
                                    "Port 3389 open to 0.0.0.0/0",
                                    "HIGH"
                                )
                            )

    except ClientError as e:
        print(f"EC2 scan error: {e}")

    return findings 


