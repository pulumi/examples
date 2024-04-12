from pulumi import Config, export

##
#   company
#   └─ department
#      └─ team
##

config = Config()
company_name = config.require("companyName")

export("companyName", company_name)
