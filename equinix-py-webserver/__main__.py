import pulumi_equinix as equinix
import pulumi_random as random
from pulumi import export

random_host_name = random.RandomPet("hostname")

project = equinix.get_project(
    name="ci-project"
)

vm = equinix.Device(
    "vm",
    billing_cycle="hourly",
    metro="da",
    hostname=random_host_name.id,
    operating_system="ubuntu_20_04",
    plan="c3.small.x86",
    project_id=project.id,
    ip_addresses=[{
        "type": "public_ipv4",
    }, {
        "type": "private_ipv4",
    }]
)

export('ip', vm.access_public_ipv4)
export('name', vm.hostname)
