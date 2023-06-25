import boto3
import requests
import os
import datetime

API_ENDPOINT = 'https://api.pulumi.com/api'
ORG = 'jkodrofftest'  # TODO: Make org an env var


def get_pulumi_token():
    ssm_path = '/pulumi-search-export-to-s3/pulumi-access-token'

    ssm = boto3.client('ssm')
    response = ssm.get_parameter(
        Name=ssm_path,
        WithDecryption=True
    )

    value = response['Parameter']['Value']
    if not value:
        raise Exception(
            f"An SSM secret must be defined at the path '{ssm_path}' and must be set to the value of a valid Pulumi access token.")

    return value


PULUMI_TOKEN = get_pulumi_token()

HEADERS = {
    'Authorization': f'token {PULUMI_TOKEN}',
    'Accept': 'application/vnd.pulumi+8',
    'Content-Type': 'application/json',
}


def get_bucket_name():
    key = 'DESTINATION_BUCKET_NAME'
    if key not in os.environ:
        raise Exception(
            f"Environment variable '{key}' must be set to the ARN of the destination bucket in which to place exported search results.")

    return os.environ[key]


BUCKET_NAME = get_bucket_name()


def handle(event, context):
    timestamp = datetime.datetime.now()
    r = requests.get(
        f'{API_ENDPOINT}/orgs/{ORG}/search/resources/export', headers=HEADERS)

    filename = f'{str(timestamp).replace(" ", "-").replace(":","-")}.csv'

    s3 = boto3.client('s3')
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=f"pulumi-search-exports/{filename}",
        Body=r.content
    )

    print(r.content)
    return "OK"
