import boto3
from botocore.exceptions import ClientError

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