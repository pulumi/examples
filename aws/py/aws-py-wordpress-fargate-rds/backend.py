from pulumi import ComponentResource, ResourceOptions
from pulumi_aws import rds


class DbArgs:

    def __init__(self,
                 db_name=None,
                 db_user=None,
                 db_password=None,
                 subnet_ids=None,
                 security_group_ids=None,
                 allocated_storage=20,
                 engine='mysql',
                 engine_version='5.7',
                 instance_class='db.t2.micro',
                 storage_type='gp2',
                 skip_final_snapshot=True,
                 publicly_accessible=False):

        self.db_name = db_name
        self.db_user = db_user
        self.db_password = db_password
        self.subnet_ids = subnet_ids
        self.security_group_ids = security_group_ids
        self.allocated_storage = allocated_storage
        self.engine = engine
        self.engine_version = engine_version
        self.instance_class = instance_class
        self.storage_type = storage_type
        self.skip_final_snapshot = skip_final_snapshot
        self.publicly_accessible = publicly_accessible


class Db(ComponentResource):

    def __init__(self,
                 name: str,
                 args: DbArgs,
                 opts: ResourceOptions = None):

        super().__init__('custom:resource:Backend', name, {}, opts)

        # Create RDS subnet group to put RDS instance on.
        subnet_group_name = f'{name}-sng'
        rds_subnet_group = rds.SubnetGroup(subnet_group_name,
            subnet_ids=args.subnet_ids,
            tags={
                'Name': subnet_group_name
            },
            opts=ResourceOptions(parent=self)
            )

        rds_name = f'{name}-rds'
        self.db = rds.Instance(rds_name,
            name=args.db_name,
            allocated_storage=args.allocated_storage,
            engine=args.engine,
            engine_version=args.engine_version,
            instance_class=args.instance_class,
            storage_type=args.storage_type,
            db_subnet_group_name=rds_subnet_group.id,
            username=args.db_user,
            password=args.db_password,
            vpc_security_group_ids=args.security_group_ids,
            skip_final_snapshot=args.skip_final_snapshot,
            publicly_accessible=args.publicly_accessible,
            opts=ResourceOptions(parent=self)
            )

        self.register_outputs({})
