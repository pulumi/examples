import unittest
import pulumi

class MyMocks(pulumi.runtime.Mocks):
    def new_resource(self, type_, name, inputs, provider, id_):
        return [name + '_id', inputs]
    def call(self, token, args, provider):
        return {}

pulumi.runtime.set_mocks(MyMocks())

# Now actually import the code that creates resources, and then test it.
import infra

class TestingWithMocks(unittest.TestCase):
    # Test if the service has tags and a name tag.
    @pulumi.runtime.test
    def test_server_tags(self):
        def check_tags(args):
            urn, tags = args
            self.assertIsNotNone(tags, f'server {urn} must have tags')
            self.assertIn('Name', tags, 'server {urn} must have a name tag')

        return pulumi.Output.all(infra.server.urn, infra.server.tags).apply(check_tags)

    # Test if the instance is configured with user_data.
    @pulumi.runtime.test
    def test_server_userdata(self):
        def check_user_data(args):
            urn, user_data = args
            self.assertFalse(user_data, f'illegal use of user_data on server {urn}')

        return pulumi.Output.all(infra.server.urn, infra.server.user_data).apply(check_user_data)

    # Test if port 22 for ssh is exposed.
    @pulumi.runtime.test
    def test_security_group_rules(self):
        def check_security_group_rules(args):
            urn, ingress = args
            ssh_open = any([rule['from_port'] == 22 and any([block == "0.0.0.0/0" for block in rule['cidr_blocks']]) for rule in ingress])
            self.assertFalse(ssh_open, f'security group {urn} exposes port 22 to the Internet (CIDR 0.0.0.0/0)')

        # Return the results of the unit tests.
        return pulumi.Output.all(infra.group.urn, infra.group.ingress).apply(check_security_group_rules)
