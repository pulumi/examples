// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

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
    public Pulumi.Output<string> Password { get; set; }
    public Pulumi.Output<string> SshPublicKey { get; set; }

    public MyConfig()
    {
        var cfg = new Pulumi.Config();

        K8SVersion = cfg.Get("k8sVersion") ?? "1.18.14";
        NodeCount = cfg.GetInt32("nodeCount") ?? 2;
        NodeSize = cfg.Get("nodeSize") ?? "Standard_D2_v2";

        GeneratedKeyPair = new PrivateKey("ssh-key", new PrivateKeyArgs()
        {
            Algorithm = "RSA",
            RsaBits = 4096
        });

        AdminUserName = cfg.Get("adminUserName") ?? "testuser";

        var pw = cfg.Get("password");
        if (pw == null)
        {
            Password = GenerateRandomPassword();
        }
        else
        {
            Password = Pulumi.Output.Create(pw);
        }

        var sshPubKey = cfg.Get("sshPublicKey");
        if (sshPubKey == null)
        {
            SshPublicKey = GeneratedKeyPair.PublicKeyOpenssh;
        }
        else
        {
            SshPublicKey = Pulumi.Output.Create(sshPubKey);
        }
    }

    private Pulumi.Output<string> GenerateRandomPassword()
    {
        var pw = new RandomPassword("pw", new RandomPasswordArgs()
        {
            Length = 20,
            Special = true
        });
        return pw.Result;
    }
}
