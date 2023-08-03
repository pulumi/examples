// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

package main

import (
	"context"
	"fmt"

	armauth "github.com/Azure/azure-sdk-for-go/services/authorization/mgmt/2015-07-01/authorization"
	"github.com/Azure/go-autorest/autorest"
	"github.com/Azure/go-autorest/autorest/adal"
	"github.com/pulumi/pulumi-azure-native-sdk/authorization/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/containerregistry/v2"
	"github.com/pulumi/pulumi-azure-native-sdk/resources/v2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create an Azure Resource Group
		resourceGroup, err := resources.NewResourceGroup(ctx, "resourceGroup", nil)
		if err != nil {
			return err
		}

		registry, err := containerregistry.NewRegistry(ctx, "registry", &containerregistry.RegistryArgs{
			ResourceGroupName: resourceGroup.Name,
			Sku:               containerregistry.SkuArgs{Name: pulumi.String("Basic")},
			AdminUserEnabled:  pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		clientConfig, err := authorization.GetClientConfig(ctx)
		if err != nil {
			return err
		}
		currentPrincipal := clientConfig.ObjectId

		roleDef, err := getRoleIdByName(ctx, "AcrPull", "")
		if err != nil {
			return err
		}
		_, err = authorization.NewRoleAssignment(ctx, "access-from-cluster", &authorization.RoleAssignmentArgs{
			PrincipalId:      pulumi.String(currentPrincipal),
			PrincipalType:    pulumi.String(authorization.PrincipalTypeServicePrincipal), // adjust the type if you are running as a user
			RoleDefinitionId: pulumi.String(*roleDef),
			Scope:            registry.ID(),
		})
		if err != nil {
			return err
		}

		return nil
	})
}

func getRoleDefinitionsClient(ctx *pulumi.Context) (*armauth.RoleDefinitionsClient, error) {
	config, err := authorization.GetClientConfig(ctx)
	if err != nil {
		return nil, err
	}
	token, err := authorization.GetClientToken(ctx, nil)
	if err != nil {
		return nil, err
	}
	authorizer := autorest.NewBearerAuthorizer(&adal.Token{AccessToken: token.Token})
	// Note: reuse the credentials and/or the client in case your scenario needs
	// multiple calls to Azure SDKs.
	client := armauth.NewRoleDefinitionsClient(config.SubscriptionId)
	client.Authorizer = authorizer
	return &client, nil
}

func getRoleIdByName(ctx *pulumi.Context, roleName string, scope string) (*string, error) {
	client, err := getRoleDefinitionsClient(ctx)
	if err != nil {
		return nil, err
	}
	roles, err := client.List(context.Background(), scope, fmt.Sprintf("roleName eq '%s'", roleName))
	if err != nil {
		return nil, err
	}
	if len(roles.Values()) == 0 {
		return nil, fmt.Errorf("role %q not found at scope %q", roleName, scope)
	}
	if len(roles.Values()) > 1 {
		return nil, fmt.Errorf("too many roles %q found at scope %q. Found: %d", roleName, scope, len(roles.Values()))
	}
	role := roles.Values()[0]
	return role.ID, nil
}
