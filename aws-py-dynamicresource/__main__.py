# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import json
import base64
import pulumi
# import pulumi_mysql as mysql
from mysql_dynamic_provider import Schema, SchemaInputs

# Get neccessary settings from the pulumi config
config = pulumi.Config()
admin_name = config.require("sql-admin-name")
admin_password = config.require_secret("sql-admin-password")
user_name = config.require("sql-user-name")
user_password = config.require_secret("sql-user-password")
availability_zone = 'us-west-1'

# The database schema and initial data to be deployed to the database
creation_script = """
    CREATE TABLE votesTable (
        choice_id int(10) NOT NULL AUTO_INCREMENT,
        vote_count int(10) NOT NULL,
        PRIMARY KEY (choice_id)
    ) ENGINE=InnoDB;
    INSERT INTO votesTable(choice_id, vote_count) VALUES (0,0);
    INSERT INTO votesTable(choice_id, vote_count) VALUES (1,0);
    """

# The SQL commands the database performs when deleting the schema
deletion_script = "DROP TABLE votesTable CASCADE"

# Creating our dynamic resource to deploy the schema during `pulumi up`. The arguments
# are passed in as a SchemaInputs object
mysql_votes_table = Schema(name="mysql_votes_table",
    args=SchemaInputs(admin_name,
                      admin_password,
                      'mysql_rds_server.address',
                      'mysql_database.name',
                      creation_script,
                      deletion_script))

# Exporting the ID of the dynamic resource we created
pulumi.export("dynamic-resource-id", mysql_votes_table.id)
pulumi.export("creator-name", mysql_votes_table.creator_name)
