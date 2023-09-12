import pulumi_aws as aws
import pulumi as pulumi


def create_firewall_policy(supernet_cidr: str) -> pulumi.Output[str]:
    drop_remote = aws.networkfirewall.RuleGroup(
        "drop-remote",
        aws.networkfirewall.RuleGroupArgs(
            capacity=2,
            name="drop-remote",
            type="STATELESS",
            rule_group={
                "rules_source": {
                    "stateless_rules_and_custom_actions": {
                        "stateless_rules": [{
                            "priority": 1,
                            "rule_definition": {
                                "actions": ["aws:drop"],
                                "match_attributes": {
                                    "protocols": [6],
                                    "sources": [{
                                        "address_definition": "0.0.0.0/0"
                                    }],
                                    "source_ports": [{
                                        "from_port": 22,
                                        "to_port": 22,
                                    }],
                                    "destinations": [{
                                        "address_definition": "0.0.0.0/0"
                                    }],
                                    "destination_ports": [{
                                        "from_port": 22,
                                        "to_port": 22,
                                    }]
                                }
                            }
                        }]
                    }
                }
            }
        )
    )

    allow_icmp = aws.networkfirewall.RuleGroup(
        "allow-icmp",
        aws.networkfirewall.RuleGroupArgs(
            capacity=100,
            type="STATEFUL",
            rule_group={
                "rule_variables": {
                    "ip_sets": [{
                        "key": "SUPERNET",
                        "ip_set": {
                            "definition": [supernet_cidr]
                        }
                    }]
                },
                "rules_source": {
                    "rules_string": 'pass icmp $SUPERNET any -> $SUPERNET any (msg: "Allowing ICMP packets"; sid:2; rev:1;)'
                },
                "stateful_rule_options": {
                    "rule_order": "STRICT_ORDER"
                },
            }
        )
    )

    allow_amazon = aws.networkfirewall.RuleGroup(
        "allow-amazon",
        aws.networkfirewall.RuleGroupArgs(
            capacity=100,
            name="allow-amazon",
            type="STATEFUL",
            rule_group=aws.networkfirewall.RuleGroupRuleGroupArgs(
                rules_source=aws.networkfirewall.RuleGroupRuleGroupRulesSourceArgs(
                    rules_string='pass tcp any any <> $EXTERNAL_NET 443 (msg:"Allowing TCP in port 443"; flow:not_established; sid:892123; rev:1;)\n' +
                    'pass tls any any -> $EXTERNAL_NET 443 (tls.sni; dotprefix; content:".amazon.com"; endswith; msg:"Allowing .amazon.com HTTPS requests"; sid:892125; rev:1;)'
                ),
                stateful_rule_options={
                    "rule_order": "STRICT_ORDER",
                },
            )
        )
    )

    policy = aws.networkfirewall.FirewallPolicy(
        "firewall-policy",
        aws.networkfirewall.FirewallPolicyArgs(
            firewall_policy=aws.networkfirewall.FirewallPolicyFirewallPolicyArgs(
                stateless_default_actions=["aws:forward_to_sfe"],
                stateless_fragment_default_actions=["aws:forward_to_sfe"],
                stateful_default_actions=[
                    "aws:drop_strict", "aws:alert_strict"],
                stateful_engine_options={
                    "rule_order": "STRICT_ORDER"
                },
                stateless_rule_group_references=[{
                    "priority": 10,
                    "resource_arn": drop_remote.arn
                }],
                stateful_rule_group_references=[
                    {
                        "priority": 10,
                        "resource_arn": allow_icmp.arn,
                    },
                    {
                        "priority": 20,
                        "resource_arn": allow_amazon.arn,
                    },
                ]
            )
        )
    )

    return policy.arn
