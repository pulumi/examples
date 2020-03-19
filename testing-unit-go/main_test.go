package main

import (
	"github.com/pulumi/pulumi/pkg/resource"
	"github.com/pulumi/pulumi/sdk/go/pulumi"
	"github.com/stretchr/testify/assert"
	"testing"
)

type testMonitor struct {
	CallF        func(tok string, args resource.PropertyMap, provider string) (resource.PropertyMap, error)
	NewResourceF func(typeToken, name string, inputs resource.PropertyMap,
		provider, id string) (string, resource.PropertyMap, error)
}

func (m *testMonitor) Call(tok string, args resource.PropertyMap, provider string) (resource.PropertyMap, error) {
	if m.CallF == nil {
		return resource.PropertyMap{}, nil
	}
	return m.CallF(tok, args, provider)
}

func (m *testMonitor) NewResource(typeToken, name string, inputs resource.PropertyMap,
	provider, id string) (string, resource.PropertyMap, error) {

	if m.NewResourceF == nil {
		return name, resource.PropertyMap{}, nil
	}
	return m.NewResourceF(typeToken, name, inputs, provider, id)
}

func TestCreateBucket(t *testing.T) {
	bucketName := "my-bucket-unique-name"

	mocks := &testMonitor{
		NewResourceF: func(typeToken, name string, inputs resource.PropertyMap,
			provider, id string) (string, resource.PropertyMap, error) {
			assert.Equal(t, "aws:s3/bucket:Bucket", typeToken)
			return id, resource.NewPropertyMapFromMap(map[string]interface{}{
				"bucket": bucketName,
			}), nil
		},
	}

	err := pulumi.RunErr(func(ctx *pulumi.Context) error {
		bucket, err := CreateBucket(ctx)
		assert.NoError(t, err)

		resultChan := make(chan string)

		bucket.Bucket.ApplyT(func(val string) (string, error) {
			resultChan <- val
			return val, nil
		})

		actual := <-resultChan
		assert.Equal(t, bucketName, actual)

		return nil
	}, pulumi.WithMocks("project", "stack", mocks))
	assert.NoError(t, err)
}
