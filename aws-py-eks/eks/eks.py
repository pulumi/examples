import os
from pulumi import Output, ResourceOptions
from pulumi.remote import ProxyComponentResource
from pulumi.runtime import register_proxy_constructor
from pulumi_aws import eks
from typing import Any, Optional

# TODO: Passing `id` here is a hack that is needed until the AWS library is updated to handle `urn`
# opts.  For now, we trick it into doing almost the right thing by passing `id` as well, though this
# also causes output properties to not get populated correctly.
# TODO: This belongs in the AWS package.
register_proxy_constructor("aws:eks/cluster:Cluster", lambda name, opts: eks.Cluster(name, opts=ResourceOptions(id="", **opts)));

class Cluster(ProxyComponentResource):
    kubeconfig: Output[Any]
    eksCluster: eks.Cluster
    def __init__(__self__, resource_name: str, opts: Optional[ResourceOptions]=None, deploy_dashboard:Optional[bool]=None) -> None:
        super().__init__(
            "eks:index:Cluster",
            resource_name,
            os.path.abspath(os.path.join(os.path.dirname(__file__), "node_modules", "@pulumi", "eks")),
            "Cluster",
            {
                "deployDashboard": deploy_dashboard,
            },
            {
                "kubeconfig": None,
                "eksCluster": None,
            },
            opts,
        )
register_proxy_constructor("eks:index:Cluster", Cluster)
