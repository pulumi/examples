// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { createUserData, renderConfigFile } from "pcloudinit";
import * as config from "./config";

const webSg = new aws.ec2.SecurityGroup("webServerSecurityGroup", {
    description: "Enable HTTP and SSH access",
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: [ "0.0.0.0/0" ] },
    ],
    ingress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: [ "0.0.0.0/0" ] },
    ],
});

const amiId = aws.ec2.getAmi({
    filters: [
        {
            name: "name",
            values: ["amzn-ami-hvm-2018.03*"],
        },
        {
            name: "virtualization-type",
            values: ["hvm"],
        },
    ],
    mostRecent: true,
    owners: ["137112412989"],
}, { async: true }).then(ami => ami.id);

const webServer = new aws.ec2.Instance("webServer", {
    ami: amiId,
    instanceType: config.instanceType,
    vpcSecurityGroupIds: [ webSg.id ],
    userData: createUserData(
        [ "install_ruby_2_3_1", "install_mysql", "configure_mysql", "install_application" ],
        {
            "install_ruby_2_3_1": {
                files: {
                    "/tmp/install_ruby": {
                        content: renderConfigFile("./files/install_ruby", config),
                        mode: "000500",
                        owner: "root",
                        group: "root",
                    },
                },
                commands: {
                    "01_install_ruby": {
                        command: "/tmp/install_ruby > /var/log/install_ruby.log",
                    },
                },
            },
            "install_mysql": {
                packages: {
                    yum: [ "mysql", "mysql-server", "mysql-devel", "mysql-libs" ],
                },
                files: {
                    "/tmp/setup.mysql": {
                        content: renderConfigFile("./files/setup.mysql", config),
                        mode: "000400",
                        owner: "root",
                        group: "root",
                    },
                },
                services: {
                    "sysvinit": {
                        "mysqld": { enabled: true, ensureRunning: true },
                    },
                },
            },
            "configure_mysql": {
                commands: {
                    "01_set_mysql_root_password": {
                        command: `mysqladmin -u root password '${config.dbRootPassword}'`,
                        test: `$(mysql ${config.dbName} -u root --password='${config.dbRootPassword}' >/dev/null 2>&1 </dev/null); (( $? != 0 ))`,
                    },
                    "02_create_database": {
                        command: `mysql -u root --password='${config.dbRootPassword}' < /tmp/setup.mysql`,
                        test: `$(mysql ${config.dbName} -u root --password='${config.dbRootPassword}' >/dev/null 2>&1 </dev/null); (( $? != 0 ))`,
                    },
                    "03_cleanup": {
                        command: "rm /tmp/setup.mysql",
                    },
                },
            },
            "install_application": {
                files: {
                    "/tmp/database.yml": {
                        content: renderConfigFile("./files/database.yml", config),
                        mode: "000400",
                        owner: "root",
                        group: "root",
                    },
                    "/tmp/install_application": {
                        content: renderConfigFile("./files/install_application", config),
                        mode: "000500",
                        owner: "root",
                        group: "root",
                    },
                    "/home/ec2-user/start_application": {
                        content: renderConfigFile("./files/start_application", config),
                        mode: "000500",
                        owner: "root",
                        group: "root",
                    },
                },
                commands: {
                    "01_install_application": {
                        command: "/tmp/install_application > /var/log/install_application.log",
                    },
                    "02_configure_reboot": {
                        command: "echo /home/ec2-user/start_application >> /etc/rc.local",
                    },
                    "03_start_application": {
                        command: "/home/ec2-user/start_application > /var/log/start_application.log",
                    },
                    "04_cleanup": {
                        command: "rm /tmp/install_application",
                    },
                },
            },
        },
    ),
});

// Export the VM IP in case we want to SSH.
export let vmIP = webServer.publicIp;

// Export the URL for our newly created Rails application.
export let websiteURL = pulumi.interpolate `http://${webServer.publicDns}/notes`;
