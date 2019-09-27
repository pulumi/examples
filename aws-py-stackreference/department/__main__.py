from pulumi import Config, export

##
#   company
#   └─ department
#      └─ team
##

config = Config()
department_name = config.require("departmentName")

export("departmentName", department_name)
