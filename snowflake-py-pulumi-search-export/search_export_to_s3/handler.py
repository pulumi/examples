import boto3
import requests

API_ENDPOINT = 'https://api.pulumi.com/api'
ORG = 'jkodrofftest'  # TODO: Make org an env var


def get_pulumi_token():
    ssm = boto3.client('ssm')
    response = ssm.get_parameter(
        Name='/pulumi-search-export-to-s3/pulumi-access-token',
        WithDecryption=True
    )
    return response['Parameter']['Value']


PULUMI_TOKEN = get_pulumi_token()

HEADERS = {
    'Authorization': f'token {PULUMI_TOKEN}',
    'Accept': 'application/vnd.pulumi+8',
    'Content-Type': 'application/json',
}


def handle(event, context):
    r = requests.get(
        f'{API_ENDPOINT}/orgs/{ORG}/search/resources/export', headers=HEADERS)

    print(r.content)
