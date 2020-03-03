import pulumi
import eks

cluster = eks.Cluster("cluster", deploy_dashboard=False, tags={"Owner": "Luke Hoban"})

pulumi.export("kubeconfig", cluster.kubeconfig)
pulumi.export("cluster_id", cluster.eksCluster.id)
pulumi.export("cluster_endpoint", cluster.eksCluster.endpoint)
