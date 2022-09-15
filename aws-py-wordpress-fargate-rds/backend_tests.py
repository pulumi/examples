from unicodedata import name
import unittest
import pulumi

from typing import (
    Tuple, 
    Optional,
    List
)

class Mocks(pulumi.runtime.Mocks):
    def new_resource(self, args: pulumi.runtime.MockResourceArgs) -> Tuple[Optional[str], dict]:
        print(args.name)
        return super().new_resource(args)

    def call(self, args: pulumi.runtime.MockCallArgs) -> Tuple[dict, Optional[List[Tuple[str, str]]]]:
        if args.token == "aws:index/getAvailabilityZones:getAvailabilityZones":
            return {}
        return args.args

pulumi.runtime.set_mocks(Mocks())

from network import Vpc, VpcArgs
from backend import Db, DbArgs

vpc = Vpc(
    "vpc",
    VpcArgs()
)

subnet_ids=[]
for subnet in vpc.subnets:
    subnet_ids.append(subnet.id)

db = Db(
    "test-db",
    args=DbArgs(
        name="test-db",
        db_user="user",
        db_password="mysuperpassword",
        subnet_ids=subnet_ids,
        security_group_ids=[vpc.rds_security_group.id]
    )
)