import unittest
import pulumi

class MyMocks(pulumi.runtime.Mocks):
    def call(self, token, args, provider):
        return {}

    def new_resource(self, type_, name, inputs, provider, id_):
        if type_ == 'aws:ec2/securityGroup:SecurityGroup':
            state = {
                'arn': 'arn:aws:ec2:us-west-2:123456789012:security-group/sg-12345678',
                'name': inputs['name'] if 'name' in inputs else name + '-sg',
            }
            return ['sg-12345678', dict(inputs, **state)]
        elif type_ == 'aws:ec2/instance:Instance':
            state = {
                'arn': 'arn:aws:ec2:us-west-2:123456789012:instance/i-1234567890abcdef0',
                'instanceState': 'running',
                'primaryNetworkInterfaceId': 'eni-12345678',
                'privateDns': 'ip-10-0-1-17.ec2.internal',
                'public_dns': 'ec2-203-0-113-12.compute-1.amazonaws.com',
                'public_ip': '203.0.113.12',
            }
            return ['i-1234567890abcdef0', dict(inputs, **state)]
        else:
            return ['', {}]

pulumi.runtime.set_mocks(MyMocks())

# Now actually import the code that creates resources, and then test it.
import resources

class TestingWithMocks(unittest.TestCase):
    @pulumi.runtime.test
    def test_component(self):
        def check_outprop(outprop):
            self.assertEqual(outprop, 'output: hello')
        return resources.mycomponent.outprop.apply(check_outprop)

    @pulumi.runtime.test
    def test_custom(self):
        def check_ip(ip):
            self.assertEqual(ip, '203.0.113.12')
        return resources.myinstance.public_ip.apply(check_ip)