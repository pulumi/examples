#!/bin/bash

set -o errexit -o pipefail
source ./infrastructure/scripts/helpers.sh

if [ "$1" == "all" ]; then
    examples=(

        # AWS examples

        # These need to be moved into the examples repo.
        # ecs-fargate
        # ec2-webserver
        # rest-api
        # s3-website
        # s3-folder-component
        # video-thumbnailer
        # aws-ts-slackbot
        # aws-ts-static-website
        # aws-ts-assume-role
        # aws-ts-hello-fargate
        # aws-ts-stackreference
        # aws-ts-apigateway-lambda-serverless
        # aws-ts-stepfunctions
        # aws-py-fargate
        # aws-ts-apigatewayv2-http-api
        # aws-py-apigateway-lambda-serverless
        # aws-ts-secrets-manager
        # aws-py-wordpress-fargate-rds
        # aws-py-eks
        # aws-go-lambda
        # aws-ts-eks
        # aws-ts-scheduled-function
        # aws-ts-eks-hello-world
        # aws-py-dynamicresource
        # aws-ts-appsync
        # aws-go-assume-role
        # aws-py-stackreference
        # aws-py-resources
        # aws-ts-airflow
        # aws-ts-s3-folder
        # aws-ts-s3-lambda-copyzip
        # aws-js-sqs-slack
        # aws-go-eks
        # aws-py-secrets-manager
        # aws-py-webserver
        # aws-ts-wordpress-fargate-rds
        # aws-py-ecs-instances-autoapi
        # aws-go-lambda-gateway
        # aws-py-static-website
        # aws-go-webserver
        # aws-ts-ec2-provisioners
        # aws-py-apigatewayv2-http-api-quickcreate
        # aws-ts-containers
        # aws-ts-apigateway-auth0
        # aws-py-stepfunctions
        # aws-cs-lambda
        # aws-cs-fargate
        # aws-js-containers
        # aws-ts-resources
        # aws-py-assume-role
        # aws-cs-assume-role
        # aws-py-s3-folder
        # aws-py-slackbot
        # aws-ts-ansible-wordpress
        # aws-go-fargate
        # aws-go-resources
        # aws-ts-ecs-anywhere
        # aws-ts-ruby-on-rails
        # aws-go-slackbot
        # aws-ts-vpc-with-ecs-fargate-py
        # aws-py-voting-app
        # aws-ts-synthetics-canary
        # aws-go-secrets-manager
        # aws-ts-apigateway
        # aws-py-hub-and-spoke-network
        # aws-go-ansible-wordpress
        # aws-ts-lambda-thumbnailer
        # aws-ts-webserver
        # aws-ts-lambda-efs
        # aws-cs-eks
        # aws-py-appsync
        # aws-ts-k8s-mern-voting-app
        # aws-py-django-voting-app
        # aws-ts-stackreference-architecture
        # aws-ts-voting-app
        # aws-ts-organizations
        # aws-go-appsync
        # aws-ts-apigatewayv2-eventbridge
        # aws-ts-url-shortener-cache-http
        # aws-cs-webserver
        # aws-ts-eks-migrate-nodegroups
        # aws-fs-lambda-webserver
        # aws-ts-k8s-voting-app
        # aws-go-s3-folder-component
        # aws-py-apigatewayv2-eventbridge
        # aws-ts-pern-voting-app
        # aws-ts-redshift-glue-etl
        # aws-yaml-ansible-wordpress
        # aws-ts-serverless-raw
        # aws-ts-pulumi-webhooks
        # aws-js-webserver
        # aws-yaml-eks
        # aws-ts-apigateway-eventbridge
        # aws-cs-s3-folder
        # aws-cs-ansible-wordpress
        # aws-ts-apigatewayv2-http-api-quickcreate
        # aws-ts-pulumi-miniflux
        # aws-ts-twitter-athena
        # aws-ts-thumbnailer
        # aws-js-s3-folder
        # aws-cs-secrets-manager
        # aws-py-redshift-glue-etl
        # aws-py-ec2-provisioners
        # aws-go-s3-folder
        # aws-js-webserver-component
        # aws-yaml-static-website
        # aws-js-s3-folder-component
        # aws-py-serverless-raw
        # aws-go-console-slack-notification
        # aws-ts-netlify-cms-and-oauth
        # aws-java-ansible-wordpress
        # aws-ts-serverless-datawarehouse
        # aws-ts-eks-distro
        # aws-py-ansible-wordpress
        # aws-fs-s3-folder
        # aws-java-eks-minimal
        # aws-java-webserver

        # Azure examples

        # azure-cs-aci
        # azure-cs-aks-cosmos-helm
        # azure-cs-aks-helm
        # azure-cs-aks-multicluster
        # azure-cs-aks
        # azure-cs-appservice-docker
        # azure-cs-appservice
        # azure-cs-call-azure-api
        # azure-cs-containerapps
        # azure-cs-cosmosdb-logicapp
        # azure-cs-credential-rotation-one-set
        # azure-cs-functions
        # azure-cs-net5-aks-webapp
        # azure-cs-sqlserver
        # azure-cs-static-website
        # azure-cs-synapse
        # azure-go-aci
        # azure-go-aks-helm
        # azure-go-aks-multicluster
        # azure-go-aks
        # azure-go-appservice-docker
        # azure-go-containerapps
        # azure-go-static-website
        # azure-java-appservice-sql
        # azure-java-function-graal-spring
        # azure-py-aci
        # azure-py-aks-helm
        # azure-py-aks-multicluster
        # azure-py-aks
        # azure-py-appservice-docker
        # azure-py-appservice
        # azure-py-call-azure-sdk
        # azure-py-containerapps
        # azure-py-cosmosdb-logicapp
        # azure-py-minecraft-server
        # azure-py-static-website
        # azure-py-synapse
        # azure-py-virtual-data-center
        # azure-py-webserver
        # azure-ts-aci
        # azure-ts-aks-helm
        # azure-ts-aks-multicluster
        # azure-ts-aks
        # azure-ts-appservice-docker
        # azure-ts-appservice
        # azure-ts-call-azure-sdk
        # azure-ts-containerapps
        # azure-ts-cosmosdb-logicapp
        # azure-ts-functions-many
        # azure-ts-functions
        # azure-ts-static-website
        # azure-ts-webapp-privateendpoint-vnet-injection
        # azure-ts-webserver
        # azure-yaml-app-service
        # azure-yaml-container-apps
        # azure-yaml-static-website
        # classic-azure-cs-botservice
        # classic-azure-cs-cosmosapp-component
        # classic-azure-cs-msi-keyvault-rbac
        # classic-azure-cs-vm-scaleset
        # classic-azure-cs-webserver
        # classic-azure-fs-aci
        # classic-azure-fs-aks
        # classic-azure-fs-appservice
        # classic-azure-go-aks-multicluster
        # classic-azure-go-webserver-component
        # classic-azure-py-arm-template
        # classic-azure-py-msi-keyvault-rbac
        # classic-azure-py-vm-scaleset
        # classic-azure-py-webserver-component
        # classic-azure-ts-aks-helm
        # classic-azure-ts-aks-keda
        # classic-azure-ts-aks-mean
        # classic-azure-ts-aks-multicluster
        # classic-azure-ts-aks-with-diagnostics
        # classic-azure-ts-api-management
        # classic-azure-ts-appservice-devops
        # classic-azure-ts-appservice-springboot
        # classic-azure-ts-arm-template
        # classic-azure-ts-dynamicresource
        # classic-azure-ts-hdinsight-spark
        # classic-azure-ts-msi-keyvault-rbac
        # classic-azure-ts-serverless-url-shortener-global
        # classic-azure-ts-stream-analytics
        # classic-azure-ts-webserver-component
        # container-webserver

        # Google Cloud examples

        # gcp-ts-docker-gcr-cloudrun
        # gcp-ts-gke-serviceaccount
        # gcp-ts-gke-hello-world
        # gcp-py-cloudrun-cloudsql
        # gcp-ts-cloudrun
        # gcp-go-gke
        # gcp-py-gke
        # gcp-ts-functions
        # gcp-py-functions
        # gce-webserver
        # gcp-java-gke-hello-world
        # gcp-py-serverless-raw
        # gcp-ts-k8s-ruby-on-rails-postgresql
        # gcp-py-network-component
        # gcp-ts-serverless-raw
        # gcp-ts-slackbot
        # gcp-py-instance-nginx
        # gcp-cs-gke
        # gcp-go-instance
        # gcp-go-functions
        # gcp-py-webserver
        # gcp-go-webserver
        # gcp-go-functions-raw
        # gcp-ts-gke
        # gcp-cs-functions
        # gcp-js-webserver
        # google-native-ts-functions
        # google-native-ts-gke-config-connector
        # google-native-ts-k8s-python-postgresql
        # google-native-ts-k8s-ruby-on-rails-postgresql

        # DigitalOcean examples

        # digitalocean-cs-k8s
        # digitalocean-cs-loadbalanced-droplets
        # digitalocean-py-k8s
        # digitalocean-py-loadbalanced-droplets
        # digitalocean-ts-k8s
        # digitalocean-ts-loadbalanced-droplets

        # Kubernetes examples.

        kubernetes-cs-guestbook
        kubernetes-cs-helm-release-wordpress
        kubernetes-go-configmap-rollout
        kubernetes-go-exposed-deployment
        kubernetes-go-guestbook
        kubernetes-go-helm-release-wordpress
        kubernetes-go-helm-wordpress
        kubernetes-py-exposed-deployment
        kubernetes-py-guestbook
        kubernetes-py-helm-release-wordpress
        kubernetes-py-jenkins
        kubernetes-py-nginx
        kubernetes-ts-configmap-rollout
        kubernetes-ts-exposed-deployment
        kubernetes-ts-guestbook
        kubernetes-ts-helm-release-wordpress
        kubernetes-ts-helm-wordpress
        kubernetes-ts-jenkins
        kubernetes-ts-multicloud
        kubernetes-ts-nginx
        kubernetes-ts-s3-rollout
        kubernetes-ts-sock-shop
        kubernetes-ts-staged-rollout-with-prometheus

        # Other clouds.

        # alicloud-ts-ecs
        # docker-cs-multi-container-app
        # docker-py-multi-container-app
        # docker-ts-multi-container-app
        # equinix-metal-py-webserver
        # equinix-metal-ts-webserver
        # f5bigip-ts-ltm-pool
        # libvirt-py-vm
        # linode-js-webserver
        # openstack-py-webserver
        # twilio-ts-component

        # Non-conforming examples.

        # cloud-js-api
        # cloud-js-containers
        # cloud-js-httpserver
        # cloud-js-thumbnailer
        # cloud-js-thumbnailer-machine-learning
        # cloud-js-twitter-athena
        # cloud-ts-url-shortener
        # cloud-ts-url-shortener-cache
        # cloud-ts-url-shortener-cache-http
        # cloud-ts-voting-app
        # crd2pulumi-crontabs
        # kubernetes-yaml
        # multicloud-ts-buckets
        # policy-packs
        # random-yaml
        # random-yaml-cue
        # secrets-provider
        # stack-readme-cs
        # stack-readme-go
        # stack-readme-java
        # stack-readme-py
        # stack-readme-ts
        # stack-readme-yaml
        # testing-integration
        # testing-integration-py
        # testing-pac-ts
        # testing-unit-cs
        # testing-unit-cs-mocks
        # testing-unit-cs-top-level-program
        # testing-unit-fs-mocks
        # testing-unit-go
        # testing-unit-py
        # testing-unit-ts
        # testing-unit-ts-mocks-jest
        # webserver-yaml
        # webserver-yaml-json
    )

    for example in "${examples[@]}"; do
        post_example "$example" "$2" && echo "Posted $example"
    done

    exit
fi

post_example "$1" "$2" && echo "Posted $1"
