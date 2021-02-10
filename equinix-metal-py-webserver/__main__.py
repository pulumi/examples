import pulumi_equinix_metal as metal
import pulumi_random as random
from pulumi import export

random_host_name = random.RandomPet("hostname")

project = metal.get_project(
    name="ci-project"
)

vm = metal.Device(
    "vm",
    billing_cycle="hourly",
	facilities=["ewr1"],
    hostname=random_host_name.id,
    operating_system="coreos_stable",
    plan="baremetal_0",
    project_id=project.id,
    ip_addresses=[{
        "type": "public_ipv4",
    }, {
        "type": "private_ipv4",
    }]
)

export('ip', vm.access_public_ipv4)
export('name', vm.hostname)
