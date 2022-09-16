from asyncio import subprocess
from cProfile import run
from typing import List
import subprocess
import os
import requests
import boto3
from botocore.config import Config
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

class TestFailure:
    def __init__(self, property, error):
        self.property = property
        self.error = error

def validate_web_service(url: str) -> TestFailure:
    response = requests.get(url)
    if response.status_code != 200:
        return TestFailure("Web Service URL", f"received unexpected status code from Web Service :: expected status_code 200, received {response.status_code}")

    return None

def validate_ecs_service(service_name: str, cluster_name: str) -> List[TestFailure]:
    test_failures = []
    session = boto3.Session(profile_name=aws_profile)
    ecs_client = session.client("ecs", config=Config(
        region_name=aws_region,
    ))

    ecs_services = ecs_client.describe_services(
        cluster=cluster_name,
        services=[service_name]
    )

    service = ecs_services["services"][0]

    desired_count = service["desiredCount"]
    running_count = service["runningCount"]
    # ensure desired count and running count are the same
    if desired_count != running_count:
        test_failures.append(TestFailure("RunningCount", f"expected {desired_count}, actual {running_count}. DesiredCount must equal RunningCount"))

    load_balancers = service["loadBalancers"]
    if len(load_balancers) > 1 or len(load_balancers) < 1:
        test_failures.append(TestFailure("LoadBalancer", f"expected 1 load balancer, actual {len(load_balancers)}"))
    else:
        load_balancer = load_balancers[0]
        container_port = load_balancer["containerPort"]
        if (container_port != 80):
            test_failures.append("ContainerPort", f"containerPort:: expected 80, actual {container_port}")

    network_config = service["networkConfiguration"]
    vpc_config = network_config["awsvpcConfiguration"]

    # NOTE: this has been setup to fail. Current configuration has this value being set to ENALBED (true) on the ECS Service
    if vpc_config["assignPublicIp"] == "ENABLED":
        test_failures.append(TestFailure("AssignPublicIp", "expected AssignPublicIp to be disabled, actual value is enabled"))

    return test_failures

def bootstrap_environment():
    print("preping virtual env...")

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

print("setting stack configuration...")

stack.set_config("aws:region", auto.ConfigValue(value=aws_region))
stack.set_config("aws:profile", auto.ConfigValue(value=aws_profile))

print(f"using AWS region {aws_region}")

print("refreshing the stack...")
stack.refresh(on_output=print)

print("updating stack...")
up_result = stack.up(on_output=print)

# ================ Integration Tests
test_failures: List[TestFailure] = []
# expect a 200 response from our web service
web_service_url = up_result.outputs["Web Service URL"].value
web_result = validate_web_service(web_service_url)
if web_result is not None:
    test_failures.append(web_result)

cluster_name = up_result.outputs["ECS Cluster Name"].value
service_name = up_result.outputs["ECS Service Name"].value
service_result = validate_ecs_service(service_name, cluster_name)
if service_result is not None and len(service_result) > 0:
    test_failures.extend(service_result)

# add more tests as needed
# ==================================

# These errors could be written back to a PR somewhere if github/gitlab/etc is the 
print("###################### Integration Test Results #####################")
if len(test_failures) == 0:
    print("application and environment successfully validated")
else:
    print("integreation test failures encounted")
    for fail in test_failures:
        print(f"{fail.property} failed test valdation. Message:: {fail.error}")

print("#####################################################################")

# ======= Destroy the stack and resources ==============
print("destroying stack...")
stack.destroy(on_output=print)