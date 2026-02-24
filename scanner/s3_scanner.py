import boto3

s3 = boto3.client('s3')

def check_public_buckets():
    findings = []
    buckets = s3.list_buckets()['Buckets']

    for bucket in buckets:
        bucket_name = bucket['Name']

        # Check Bucket Policy
        try:
            policy = s3.get_bucket_policy(Bucket=bucket_name)
            policy_json = json.loads(policy['Policy'])

            for statement in policy_json.get("Statement", []):
                if statement.get("Principal") == "*" and statement.get("Effect") == "Allow":
                    findings.append({
                        "resource": bucket_name,
                        "issue": "Bucket has public bucket policy",
                        "severity": "HIGH"
                    })
        except:
            pass

    return findings