// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Random;
using Pulumi.Tls;

/// <summary>
/// Configures the example. If password and public key for connecting
/// to the cluster are not set with `pulumi config`, we generate a
/// random password and key pair.
/// </summary>
class MyConfig
{
    public string K8SVersion { get; set; }
    public int NodeCount { get; set; }
    public string NodeSize { get; set; }
    public PrivateKey GeneratedKeyPair { get; set; }
    public string AdminUserName { get; set; }
    public Output<string> Password { get; set; }
    public Output<string> SshPublicKey { get; set; }

    public MyConfig()
    {
        var cfg = new Config();

        this.K8SVersion = cfg.Get("k8sVersion") ?? "1.26.3";
        this.NodeCount = cfg.GetInt32("nodeCount") ?? 2;
        this.NodeSize = cfg.Get("nodeSize") ?? "Standard_D2_v2";

        this.GeneratedKeyPair = new PrivateKey("ssh-key", new PrivateKeyArgs
        {
            Algorithm = "RSA",
            RsaBits = 4096
        });

        this.AdminUserName = cfg.Get("adminUserName") ?? "testuser";

        var pw = cfg.Get("password");
        if (pw == null)
        {
            this.Password = this.GenerateRandomPassword();
        }
        else
        {
            this.Password = Output.Create(pw);
        }

        var sshPubKey = cfg.Get("sshPublicKey");
        if (sshPubKey == null)
        {
            this.SshPublicKey = this.GeneratedKeyPair.PublicKeyOpenssh;
        }
        else
        {
            this.SshPublicKey = Output.Create(sshPubKey);
        }
    }

    private Output<string> GenerateRandomPassword()
    {
        var pw = new RandomPassword("pw", new RandomPasswordArgs
        {
            Length = 20,
            Special = true
        });
        return pw.Result;
    }
}
