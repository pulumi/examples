package eks

#EksCluster: {
	type: "eks:Cluster"
	properties: {
		instanceType:    *"t2.medium" | "t3.medium"
		desiredCapacity: int | *2
		minSize:         int | *1
		maxSize:         int | *2
	}
}
