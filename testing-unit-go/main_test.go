package main

import (
	"sync"
	"testing"

	"github.com/pulumi/pulumi-aws/sdk/v2/go/aws/ec2"
	"github.com/pulumi/pulumi/sdk/v2/go/common/resource"
	"github.com/pulumi/pulumi/sdk/v2/go/pulumi"
	"github.com/stretchr/testify/assert"
)

type mocks int

// Create the mock.
func (mocks) NewResource(typeToken, name string, inputs resource.PropertyMap, provider, id string) (string, resource.PropertyMap, error) {
	return name + "_id", inputs, nil
}

func (mocks) Call(token string, args resource.PropertyMap, provider string) (resource.PropertyMap, error) {
	return args, nil
}

// Applying unit tests.
func TestInfrastructure(t *testing.T) {
	err := pulumi.RunErr(func(ctx *pulumi.Context) error {
		infra, err := createInfrastructure(ctx)
		assert.NoError(t, err)

		var wg sync.WaitGroup
		wg.Add(3)

		// Test if the service has tags and a name tag.
		pulumi.All(infra.server.URN(), infra.server.Tags).ApplyT(func(all []interface{}) error {
			urn := all[0].(pulumi.URN)
			tags := all[1].(map[string]interface{})

			assert.Containsf(t, tags, "Name", "missing a Name tag on server %v", urn)
			wg.Done()
			return nil
		})

		// Test if the instance is configured with user_data.
		pulumi.All(infra.server.URN(), infra.server.UserData).ApplyT(func(all []interface{}) error {
			urn := all[0].(pulumi.URN)
			userData := all[1].(*string)

			assert.Nilf(t, userData, "illegal use of userData on server %v", urn)
			wg.Done()
			return nil
		})

		// Test if port 22 for ssh is exposed.
		pulumi.All(infra.group.URN(), infra.group.Ingress).ApplyT(func(all []interface{}) error {
			urn := all[0].(pulumi.URN)
			ingress := all[1].([]ec2.SecurityGroupIngress)

			for _, i := range ingress {
				openToInternet := false
				for _, b := range i.CidrBlocks {
					if b == "0.0.0.0/0" {
						openToInternet = true
						break
					}
				}

				assert.Falsef(t, i.FromPort == 22 && openToInternet, "illegal SSH port 22 open to the Internet (CIDR 0.0.0.0/0) on group %v", urn)
			}

			wg.Done()
			return nil
		})

		wg.Wait()
		return nil
	}, pulumi.WithMocks("project", "stack", mocks(0)))
	assert.NoError(t, err)
}
