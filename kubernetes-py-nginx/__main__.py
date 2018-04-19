import pulumi_kubernetes as k8s

c = k8s.Pod('nginx',
    metadata={
        'name': 'nginx',
        'labels': {
            'app': 'nginx',
        },
    },
    spec={
        'containers': [{
            'image': 'nginx:1.7.9',
            'name': 'nginx',
            'ports': [{ 'container_port': 80 }],
        }],
    },
)
