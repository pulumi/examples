import pulumi
import eks

cluster = eks.Cluster("cluster", deploy_dashboard=False)

pulumi.export("kubeconfig", cluster.kubeconfig)
pulumi.export("cluster_id", cluster.eksCluster.id)
