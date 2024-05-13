# Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import mysql.connector as connector
from mysql.connector import errorcode
from pulumi import Input, Output, ResourceOptions
from pulumi.dynamic import *
from typing import Any, Optional
import binascii
import os

# A class representing the arguments that the dynamic provider needs. Each argument 
# will automatically be converted from Input[T] to T before being passed to the
# functions in the provider
class SchemaInputs(object):
    creator_name: Input[str]
    creator_password: Input[str]
    server_address: Input[str]
    database_name: Input[str]
    creation_script: Input[str]
    deletion_script: Input[str]
    def __init__(self, creator_name, creator_password, server_address, database_name, creation_script, deletion_script):
        self.creator_name = creator_name
        self.creator_password = creator_password
        self.server_address = server_address
        self.database_name = database_name
        self.creation_script = creation_script
        self.deletion_script = deletion_script

# The code for the dynamic provider that gives us our custom resource. It handles 
# all the create, read, update, and delete operations the resource needs. 
class SchemaProvider(ResourceProvider):
    
    # The function that is called when a new resource needs to be created
    def create(self, args):
        # A connection is created to the MySQL database, and the script is run
        connection = connector.connect(user=args["creator_name"], 
        password=args["creator_password"],
        host=args["server_address"],
        database=args["database_name"])
        cursor = connection.cursor()
        cursor.execute(args["creation_script"], multi=True)
        # The creation process is finished. We assign a unique ID to this resource,
        # and return all the outputs required by the resource (in this case
        # outputs are identical to the inputs)
        return CreateResult("schema-"+binascii.b2a_hex(os.urandom(16)).decode("utf-8"), outs=args)
    
    # The function that is called when an existing resource needs to be deleted
    def delete(self, id, args):
        # A connection is created to the MySQL database, and the script is run
        connection = connector.connect(user=args["creator_name"],
        password=args["creator_password"],
        host=args["server_address"],
        database=args["database_name"])
        cursor = connection.cursor()
        cursor.execute(args["deletion_script"])
    
    # The function that determines if an existing resource whose inputs were 
    # modified needs to be updated or entirely replaced
    def diff(self, id, old_inputs, new_inputs):
        # server_address, database_name, and creation_script are critical inputs
        # that require the resource to be entirely replaced if they are modified.
        # Changes in other inputs mean the resource can be safely updated without 
        # recreating it
        replaces = []
        if (old_inputs["server_address"] != new_inputs["server_address"]): replaces.append("server_address")
        if (old_inputs["database_name"] != new_inputs["database_name"]): replaces.append("database_name")
        if (old_inputs["creation_script"] != new_inputs["creation_script"]): replaces.append("creation_script") 
        
        return DiffResult(
            # If the old and new inputs don't match, the resource needs to be updated/replaced
            changes=old_inputs != new_inputs,
            # If the replaces[] list is empty, nothing important was changed, and we do not have to 
            # replace the resource
            replaces=replaces,
            # An optional list of inputs that are always constant
            stables=None,
            # The existing resource is deleted before the new one is created
            delete_before_replace=True)

    # The function that updates an existing resource without deleting and
    # recreating it from scratch
    def update(self, id, old_inputs, new_inputs):
        # The old existing inputs are discarded and the new inputs are used
        return UpdateResult(outs={**new_inputs})

# The main Schema resource that we instantiate in our infrastructure code
class Schema(Resource):
    # The inputs used by the dynamic provider are made implicitly availible as outputs 
    creator_name: Output[str]
    creator_password: Output[str]
    server_address: Output[str]
    database_name: Output[str]
    creation_script: Output[str]
    deletion_script: Output[str]
    def __init__(self, name: str, args: SchemaInputs, opts = None):
        # NOTE: The args object is converted to a dictionary using vars()
        super().__init__(SchemaProvider(), name, vars(args), opts)
