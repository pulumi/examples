import pulumi
from pulumi_gcp import compute

disk = {
    'initializeParams': {
        'image': "centos-cloud/centos-7-v20190116"
    }
}

script = "#!/bin/bash\nsudo touch /tmp/a.txt\nsudo yum install -y nginx\nsudo service nginx start"
addr = compute.address.Address(resource_name='poc')
external_ip = addr.address

network = compute.Network("network")
network_interface = [
    {
        'network': network.id,
        'accessConfigs': [{'nat_ip': external_ip}],
    }
]

firewall = compute.Firewall("firewall", network=network.self_link, allows=[{
    'protocol': "tcp",
    'ports': ["22", "80"]
}])

instance = compute.Instance('poc', name='poc', boot_disk=disk, machine_type="f1-micro",
                            network_interfaces=network_interface, metadata_startup_script=script)

# Export the DNS name of the bucket
pulumi.export('instance_name', instance.name)
pulumi.export('instance_network', instance.network_interfaces)
pulumi.export('external_ip', addr.address)
