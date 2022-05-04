package main

import "examples.pulumi.com/yaml-eks/aws:eks"

resources: {
	rawkode: eks.#EksCluster
	stack72: eks.#EksCluster & {
		properties: {
			instanceType:    "t2.medium"
			desiredCapacity: 4
			maxSize:         8
		}
	}
}
