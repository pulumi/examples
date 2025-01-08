import pulumi


class MyMocks(pulumi.runtime.Mocks):
    def new_resource(self, args: pulumi.runtime.MockResourceArgs):
        outputs = args.inputs
        if args.typ == "aws:ec2/instance:Instance":
            outputs = {
                **args.inputs,
                "publicIp": "203.0.113.12",
                "publicDns": "ec2-203-0-113-12.compute-1.amazonaws.com",
            }
        return [args.name + '_id', outputs]

    def call(self, args: pulumi.runtime.MockCallArgs):
        if args.token == "aws:ec2/getAmi:getAmi":
            return {
                "architecture": "x86_64",
                "id": "ami-0eb1f3cdeeb8eed2a",
            }
        return {}


pulumi.runtime.set_mocks(MyMocks())

# Now actually import the code that creates resources, and then test it.
import infra


# Test if the service has tags and a name tag.
@pulumi.runtime.test
def test_server_tags():
    def check_tags(args):
        urn, tags = args
        assert tags, f'server {urn} must have tags'
        assert 'Name' in tags, 'server {urn} must have a name tag'

    return pulumi.Output.all(infra.server.urn, infra.server.tags).apply(check_tags)


# Test if the instance is configured with user_data.
@pulumi.runtime.test
def test_server_userdata():
    def check_user_data(args):
        urn, user_data = args
        assert user_data is None, f'illegal use of user_data on server {urn}'

    return pulumi.Output.all(infra.server.urn, infra.server.user_data).apply(check_user_data)


# Test if port 22 for ssh is exposed.
@pulumi.runtime.test
def test_security_group_rules():
    def check_security_group_rules(args):
        urn, ingress = args
        ssh_open = any(
            [rule['from_port'] == 22 and any([block == "0.0.0.0/0" for block in rule['cidr_blocks']]) for rule in
             ingress])
        assert ssh_open is False, f'security group {urn} exposes port 22 to the Internet (CIDR 0.0.0.0/0)'

    # Return the results of the unit tests.
    return pulumi.Output.all(infra.group.urn, infra.group.ingress).apply(check_security_group_rules)
