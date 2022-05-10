# EKS cluster with EFS CSI backed PVC

## This is a quick Readme to give a basic overview, it needs work

This Pulumi code deploys an EKS cluster into a VPC provided as a config argument
with EFS backed PVCs this is important for multi-AZ kluster.

It assumes you have:
- A VPC created with three public and private subnets which are tagged Public
and Private.
- A security group for the AdminVM, an ssh jumphost, from where you are going to
run kubectl etc, which has the tag `Job: admin`  
- A security group for your VPC endpoints which has the tag `Job: Endpoints`
- A role under which the AdminVM runs which is called `AdminVM`

I hope to find the round tuits to update this Readme and maybe add in an example
for how to provision a service which uses PVC for enabled by this one. 
