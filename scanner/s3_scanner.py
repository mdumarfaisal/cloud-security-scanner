import boto3

s3 = boto3.client('s3')

def check_public_buckets():
    findings = []

    buckets = s3.list_buckets()['Buckets']

    for bucket in buckets:
        bucket_name = bucket['Name']

        try:
            acl = s3.get_bucket_acl(Bucket=bucket_name)

            for grant in acl['Grants']:
                grantee = grant.get('Grantee', {})

                if grantee.get('URI') == "http://acs.amazonaws.com/groups/global/AllUsers":
                    findings.append({
                        "resource": bucket_name,
                        "issue": "Bucket is publicly accessible",
                        "severity": "HIGH"
                    })

        except Exception as e:
            continue

    return findings