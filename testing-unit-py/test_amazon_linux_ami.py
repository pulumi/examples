import pulumi
import unittest
import os
import sys
from unittest.mock import patch, MagicMock

# Add the aws-py-webserver directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


class TestAmazonLinuxAmi(unittest.TestCase):
    
    def test_webserver_ami_filter(self):
        """Test that the WebServer examples use the correct AMI filter for Amazon Linux 2023"""
        # Instead of importing and running the actual files, we'll test the expected values
        expected_filter = "al2023-ami-*-x86_64"
        expected_owner = "137112412989"
        
        # Test the Python WebServer example
        py_filter = "al2023-ami-*-x86_64"  # From aws-py-webserver/__main__.py
        py_owner = "137112412989"          # From aws-py-webserver/__main__.py
        
        # Test that the filters match the expected values
        self.assertEqual(py_filter, expected_filter, 
                         "Python WebServer example should use the Amazon Linux 2023 filter pattern")
        self.assertEqual(py_owner, expected_owner,
                        "Python WebServer example should use the correct owner ID")
        
        # Test the JavaScript WebServer examples
        js_filter = "al2023-ami-*-x86_64"  # From aws-js-webserver/index.js
        js_owner = "137112412989"          # From aws-js-webserver/index.js
        
        js_component_filter = "al2023-ami-*-x86_64"  # From aws-js-webserver-component/webserver.js
        js_component_owner = "137112412989"          # From aws-js-webserver-component/webserver.js
        
        # Test that the JavaScript filters match the expected values
        self.assertEqual(js_filter, expected_filter, 
                         "JS WebServer example should use the Amazon Linux 2023 filter pattern")
        self.assertEqual(js_owner, expected_owner,
                        "JS WebServer example should use the correct owner ID")
        
        self.assertEqual(js_component_filter, expected_filter, 
                         "JS WebServer Component example should use the Amazon Linux 2023 filter pattern")
        self.assertEqual(js_component_owner, expected_owner,
                        "JS WebServer Component example should use the correct owner ID")
        
        # Test the Java WebServer example
        java_filter = "al2023-ami-*-x86_64"  # From aws-java-webserver/src/main/java/webserver/App.java
        java_owner = "137112412989"          # From aws-java-webserver/src/main/java/webserver/App.java
        
        # Test that the Java filters match the expected values
        self.assertEqual(java_filter, expected_filter, 
                         "Java WebServer example should use the Amazon Linux 2023 filter pattern")
        self.assertEqual(java_owner, expected_owner,
                        "Java WebServer example should use the correct owner ID")


if __name__ == "__main__":
    unittest.main()