import pulumi
from pulumi_gcp import compute

#
# network and firewall for both virtual machines
#
network = compute.Network("poc")

firewall = compute.Firewall(
    "poc",
    network=network.self_link,
    allows=[
        compute.FirewallAllowArgs(
            protocol="tcp",
            ports=["22"]
        ),
        compute.FirewallAllowArgs(
            protocol="tcp",
            ports=["80"]
        ),
    ]
)

#
# virtual machine running nginx via a [startup script](https://cloud.google.com/compute/docs/startupscript)
#
script = """#!/bin/bash
apt -y update
apt -y install nginx
"""

instance_addr = compute.address.Address("poc")
instance = compute.Instance(
    "poc",
    machine_type="f1-micro",
    boot_disk=compute.InstanceBootDiskArgs(
        initialize_params=compute.InstanceBootDiskInitializeParamsArgs(
            image="ubuntu-os-cloud/ubuntu-1804-bionic-v20200414"
        ),
    ),
    network_interfaces=[
        compute.InstanceNetworkInterfaceArgs(
            network=network.id,
            access_configs=[compute.InstanceNetworkInterfaceAccessConfigArgs(
                nat_ip=instance_addr.address
            )]
        )
    ],
    metadata_startup_script=script,
)

pulumi.export("instance_name", instance.name)
pulumi.export("instance_external_ip", instance_addr.address)

#
# virtual machine with Google's [Container-Optimized OS](https://cloud.google.com/container-optimized-os/docs) running nginx as a Docker container
#
container_instance_addr = compute.address.Address("poc-container-instance")
container_instance_metadata_script = """
spec:
    containers:
        - name: manual-container-instance-1
          image: 'gcr.io/cloud-marketplace/google/nginx1:latest'
          stdin: false
          tty: false
    restartPolicy: Always

# This container declaration format is not public API and may change without notice. Please
# use gcloud command-line tool or Google Cloud Console to run Containers on Google Compute Engine.
"""

container_instance = compute.Instance(
    "poc-container-instance",
    machine_type="f1-micro",
    boot_disk=compute.InstanceBootDiskArgs(
        initialize_params=compute.InstanceBootDiskInitializeParamsArgs(
            image="cos-cloud/cos-stable-81-12871-69-0",
        )
    ),
    metadata={
        "gce-container-declaration": container_instance_metadata_script,
    },
    network_interfaces=[
        compute.InstanceNetworkInterfaceArgs(
            network=network.id,
            access_configs=[compute.InstanceNetworkInterfaceAccessConfigArgs(
                nat_ip=container_instance_addr.address
            )]
        )
    ],
    service_account=compute.InstanceServiceAccountArgs(
        email="default",
        scopes=[
            "https://www.googleapis.com/auth/devstorage.read_only",
            "https://www.googleapis.com/auth/logging.write",
            "https://www.googleapis.com/auth/monitoring.write",
            "https://www.googleapis.com/auth/service.management.readonly",
            "https://www.googleapis.com/auth/servicecontrol",
            "https://www.googleapis.com/auth/trace.append",
        ],
    ),
)

pulumi.export("container_instance_name", container_instance.name)
pulumi.export("container_instance_external_ip", container_instance_addr.address)
