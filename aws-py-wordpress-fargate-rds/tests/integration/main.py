from asyncio import subprocess
import profile
import subprocess
import os
import requests
# import boto3
# from botocore.config import Config
from pulumi import automation as auto

# Thoughts
# ===========================
# these tests are likely geared towards a CI situation. could be:
# - daily CI tests which test against a git branch
# - tests on PR. eg- specific 
# - etc

# all test runs likely should have some meaningful output. Either all tests passed (and maybe what tests were ran?) or a result of which tests failed and for what reasons.
# I could see these being reported back to github, gitlab, etc on PR
# need to develop a response of some type

def bootstrap_environment():
    print("prep virtual env")

    subprocess.run([
        "python",
        "-m",
        "venv",
        "venv"
    ], check=True,cwd=work_dir,capture_output=True)

    py_path = os.path.join("venv", "bin", "python3")
    subprocess.run([
        py_path,
        "-m",
        "pip",
        "install",
        "--upgrade",
        "pip"
    ], check=True,cwd=work_dir,capture_output=True)

    py_path = os.path.join("venv", "bin", "pip")
    subprocess.run([
        py_path,
        "install",
        "-r",
        "requirements.txt"
    ], check=True,cwd=work_dir,capture_output=True)

    print("virutal env created")


stack_name = "integration_test"
aws_region = "us-west-2"
aws_profile = "pulumi-ce"
work_dir = os.path.join(os.path.dirname(__file__), "../..")

bootstrap_environment()

stack = auto.create_or_select_stack(stack_name, work_dir=work_dir)

print("set stack config")

print("using aws us-west-2")

stack.set_config("aws:region", auto.ConfigValue(value="us-west-2"))
stack.set_config("aws:profile", auto.ConfigValue(value="pulumi-ce"))

print("refreshing the stack...")
stack.refresh(on_output=print)

print("updating stack...")
up_result = stack.up(on_output=print)

#{'DB Endpoint': 'wp-example-be-rds04b4007.cumzewvmnnwl.us-west-2.rds.amazonaws.com', 'DB Password': [secret], 'DB User Name': 'admin', 'ECS Cluster Name': 'wp-example-fe-ecs-d7db59e', 'Web Service URL': 'http://wp-example-fe-alb-bdc54ea-1490451044.us-west-2.elb.amazonaws.com'}

# ================ tests
test_failures = {}
# expect a 200 response from our web service
response = requests.get(up_result.outputs['Web Service URL'].value)
if response.status_code != 200:
    test_failures["Web Service URL"] = f"received unexpected status code from Web Service :: expected status_code 200, received {response.status_code}"

# session = boto3.Session(profile_name=aws_profile)
# ecs_client = session.client("ecs", config=Config(
#     region_name="us_west-2",
# ))

# ecs_services = ecs_client.list_services(
#     cluster="wp-example-fe-ecs-d7db59e",
#     launchType="FARGATE"
# )

# print(ecs_services)

print(up_result.outputs)

# ===============
# print("destroying stack...")
# stack.destroy(on_output=print)