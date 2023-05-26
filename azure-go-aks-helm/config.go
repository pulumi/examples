// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.
//
// Configures the example. If password and public key for connecting
// to the cluster are not set with `pulumi config`, we generate a
// random password and key pair.

package main

import (
	"github.com/pulumi/pulumi-random/sdk/v4/go/random"
	"github.com/pulumi/pulumi-tls/sdk/v4/go/tls"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

type Config struct {
	K8sVersion       string
	Password         pulumi.StringInput
	GeneratedKeyPair *tls.PrivateKey
	AdminUserName    string
	SshPublicKey     pulumi.StringInput
	NodeCount        int
	NodeSize         string
}

func configure(ctx *pulumi.Context) (Config, error) {
	out := Config{}

	cfg := config.New(ctx, "")

	out.K8sVersion = cfg.Get("k8sVersion")
	if out.K8sVersion == "" {
		out.K8sVersion = "1.26.3"
	}

	generatedKeyPair, err := tls.NewPrivateKey(ctx, "ssh-key",
		&tls.PrivateKeyArgs{
			Algorithm: pulumi.String("RSA"),
			RsaBits:   pulumi.Int(4096),
		})
	if err != nil {
		return Config{}, err
	}
	out.GeneratedKeyPair = generatedKeyPair

	pw := cfg.Get("password")
	if pw == "" {
		randPW, err := random.NewRandomPassword(ctx, "pw",
			&random.RandomPasswordArgs{
				Length:  pulumi.Int(20),
				Special: pulumi.Bool(true),
			})

		if err != nil {
			return Config{}, err
		}

		out.Password = randPW.Result
	} else {
		out.Password = pulumi.String(pw)
	}

	out.AdminUserName = cfg.Get("adminUserName")
	if out.AdminUserName == "" {
		out.AdminUserName = "testuser"
	}

	sshPubKey := cfg.Get("sshPublicKey")
	if sshPubKey == "" {
		out.SshPublicKey = generatedKeyPair.PublicKeyOpenssh
	} else {
		out.SshPublicKey = pulumi.String(sshPubKey)
	}

	out.NodeCount = cfg.GetInt("nodeCount")
	if out.NodeCount == 0 {
		out.NodeCount = 2
	}

	out.NodeSize = cfg.Get("nodeSize")
	if out.NodeSize == "" {
		out.NodeSize = "Standard_D2_v2"
	}

	return out, nil
}
