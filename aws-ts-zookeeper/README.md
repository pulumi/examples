# ZooKeeper cluster on AWS

## Components and Features

1. Networking:
   - VPC with 3 availability zones
   - Private subnets with NAT gateways
   - Security groups for ZooKeeper traffic

2. Compute:
   - Auto Scaling Group with 3 nodes
   - Launch template with Ubuntu 24.04
   - IAM roles and instance profile
   - CloudWatch integration

3. Load Balancing:
   - Internal Application Load Balancer
   - Target group with health checks
   - Listener configuration

4. Security:
   - Security groups with minimal required ports
   - IMDSv2 requirement
   - Encrypted EBS volumes
   - SSM access for management

5. Monitoring:
   - CloudWatch agent configuration
   - CPU utilization alarms
   - Memory and disk monitoring

## Deployment

1. Set up your AWS credentials
2. Create a Pulumi stack

3. Configure the environment:

```bash

pulumi config set environment production
```

4. Deploy:

```bash

pulumi up
```
