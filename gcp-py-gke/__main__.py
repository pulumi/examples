from pulumi import Config, export, get_project, get_stack, Output, ResourceOptions
from pulumi_gcp.config import project, zone
from pulumi_gcp.container import Cluster, get_engine_versions
from pulumi_kubernetes import Provider
from pulumi_kubernetes.apps.v1 import Deployment
from pulumi_kubernetes.core.v1 import Service
from pulumi_random import RandomPassword

# Read in some configurable settings for our cluster:
config = Config(None)

# nodeCount is the number of cluster nodes to provision. Defaults to 3 if unspecified.
NODE_COUNT = config.get('node_count') or 3
# nodeMachineType is the machine type to use for cluster nodes. Defaults to n1-standard-1 if unspecified.
# See https://cloud.google.com/compute/docs/machine-types for more details on available machine types.
NODE_MACHINE_TYPE = config.get('node_machine_type') or 'n1-standard-1'
# username is the admin username for the cluster.
USERNAME = config.get('username') or 'admin'
# password is the password for the admin user in the cluster.
PASSWORD = config.get_secret('password') or RandomPassword("password", length=20, special=True).result
# master version of GKE engine
MASTER_VERSION = config.get('master_version')

# Now, actually create the GKE cluster.
k8s_cluster = Cluster('gke-cluster',
    initial_node_count=NODE_COUNT,
    node_version=MASTER_VERSION,
    min_master_version=MASTER_VERSION,
    master_auth={ 'username': USERNAME, 'password': PASSWORD },
    node_config={
        'machine_type': NODE_MACHINE_TYPE,
        'oauth_scopes': [
            'https://www.googleapis.com/auth/compute',
            'https://www.googleapis.com/auth/devstorage.read_only',
            'https://www.googleapis.com/auth/logging.write',
            'https://www.googleapis.com/auth/monitoring'
        ],
    },
)

# Manufacture a GKE-style Kubeconfig. Note that this is slightly "different" because of the way GKE requires
# gcloud to be in the picture for cluster authentication (rather than using the client cert/key directly).
k8s_info = Output.all(k8s_cluster.name, k8s_cluster.endpoint, k8s_cluster.master_auth)
k8s_config = k8s_info.apply(
    lambda info: """apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: {0}
    server: https://{1}
  name: {2}
contexts:
- context:
    cluster: {2}
    user: {2}
  name: {2}
current-context: {2}
kind: Config
preferences: {{}}
users:
- name: {2}
  user:
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{{.credential.token_expiry}}'
        token-key: '{{.credential.access_token}}'
      name: gcp
""".format(info[2]['clusterCaCertificate'], info[1], '{0}_{1}_{2}'.format(project, zone, info[0])))

# Make a Kubernetes provider instance that uses our cluster from above.
k8s_provider = Provider('gke_k8s', kubeconfig=k8s_config)

# Create a canary deployment to test that this cluster works.
labels = { 'app': 'canary-{0}-{1}'.format(get_project(), get_stack()) }
canary = Deployment('canary',
    spec={
        'selector': { 'matchLabels': labels },
        'replicas': 1,
        'template': {
            'metadata': { 'labels': labels },
            'spec': { 'containers': [{ 'name': 'nginx', 'image': 'nginx' }] },
        },
    }, __opts__=ResourceOptions(provider=k8s_provider)
)

ingress = Service('ingress',
    spec={
        'type': 'LoadBalancer',
        'selector': labels,
        'ports': [{'port': 80}],
    }, __opts__=ResourceOptions(provider=k8s_provider)
)

# Finally, export the kubeconfig so that the client can easily access the cluster.
export('kubeconfig', k8s_config)
# Export the k8s ingress IP to access the canary deployment
export('ingress_ip', Output.all(ingress.status['load_balancer']['ingress'][0]['ip']))
