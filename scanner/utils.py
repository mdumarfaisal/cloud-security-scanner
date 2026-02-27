import boto3

def get_all_regions():
    ec2 = boto3.client("ec2")
    response = ec2.describe_regions(AllRegions=False)
    return [region["RegionName"] for region in response["Regions"]]