import boto3

def list_iam_users():
    iam = boto3.client('iam')
    response = iam.list_users()

    print("IAM Users in this account:")
    for user in response['Users']:
        print(f"- {user['UserName']}")

if __name__ == "__main__":
    list_iam_users()