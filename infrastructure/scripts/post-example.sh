#!/bin/bash

set -o errexit -o pipefail
source ./infrastructure/scripts/helpers.sh

if [ "$1" == "all" ]; then
    examples=(
        # aws-apigateway-go-routes
        # aws-apigateway-py-routes
        # aws-apigateway-ts-routes
        # aws-cs-ansible-wordpress
        # aws-cs-assume-role
        # aws-cs-eks
        # aws-cs-fargate
        # aws-cs-lambda
        # aws-cs-s3-folder
        # aws-cs-secrets-manager
        # aws-cs-webserver
        # aws-fs-lambda-webserver
        # aws-fs-s3-folder
        # aws-go-ansible-wordpress

        aws-go-appsync
        aws-go-assume-role
        aws-go-console-slack-notification
        aws-go-eks
        aws-go-fargate
        aws-go-lambda
        aws-go-lambda-gateway
        aws-go-resources
        aws-go-s3-folder
        aws-go-s3-folder-component
        aws-go-secrets-manager
        aws-go-slackbot
        aws-go-webserver
        aws-js-containers

        # aws-js-s3-folder
        # aws-js-s3-folder-component
        # aws-js-sqs-slack
        # aws-js-webserver
        # aws-js-webserver-component
        # aws-native-ts-ecs
        # aws-native-ts-s3-folder
        # aws-native-ts-stepfunctions
        # aws-py-ansible-wordpress
        # aws-py-apigateway-lambda-serverless
        # aws-py-apigatewayv2-eventbridge
        # aws-py-apigatewayv2-http-api-quickcreate
        # aws-py-appsync
        # aws-py-assume-role

        # aws-py-django-voting-app
        # aws-py-dynamicresource
        # aws-py-ec2-provisioners
        # aws-py-ecs-instances-autoapi
        # aws-py-eks
        # aws-py-fargate
        # aws-py-redshift-glue-etl
        # aws-py-resources
        # aws-py-s3-folder
        # aws-py-secrets-manager
        # aws-py-serverless-raw
        # aws-py-slackbot
        # aws-py-stackreference
        # aws-py-static-website

        # aws-py-stepfunctions
        # aws-py-voting-app
        # aws-py-webserver
        # aws-py-wordpress-fargate-rds
        # aws-ts-airflow
        # aws-ts-ansible-wordpress
        # aws-ts-apigateway
        # aws-ts-apigateway-auth0
        # aws-ts-apigateway-eventbridge
        # aws-ts-apigateway-lambda-serverless
        # aws-ts-apigatewayv2-eventbridge
        # aws-ts-apigatewayv2-http-api
        # aws-ts-apigatewayv2-http-api-quickcreate
        # aws-ts-appsync

        # aws-ts-assume-role
        # aws-ts-containers
        # aws-ts-ec2-provisioners
        # aws-ts-ecs-anywhere
        # aws-ts-eks
        # aws-ts-eks-distro
        # aws-ts-eks-hello-world
        # aws-ts-eks-migrate-nodegroups
        # aws-ts-hello-fargate
        # aws-ts-k8s-mern-voting-app
        # aws-ts-k8s-voting-app
        # aws-ts-lambda-efs
        # aws-ts-lambda-thumbnailer
        # aws-ts-netlify-cms-and-oauth

        # aws-ts-organizations
        # aws-ts-pern-voting-app
        # aws-ts-pulumi-miniflux
        # aws-ts-pulumi-webhooks
        # aws-ts-redshift-glue-etl
        # aws-ts-resources
        # aws-ts-ruby-on-rails
        # aws-ts-s3-folder
        # aws-ts-s3-lambda-copyzip
        # aws-ts-scheduled-function
        # aws-ts-secrets-manager
        # aws-ts-serverless-datawarehouse
        # aws-ts-serverless-raw
        # aws-ts-slackbot

        # aws-ts-stackreference
        # aws-ts-stackreference-architecture
        # aws-ts-static-website
        # aws-ts-stepfunctions
        # aws-ts-synthetics-canary
        # aws-ts-thumbnailer
        # aws-ts-twitter-athena
        # aws-ts-url-shortener-cache-http
        # aws-ts-voting-app
        # aws-ts-vpc-with-ecs-fargate-py
        # aws-ts-webserver
        # aws-ts-wordpress-fargate-rds
        # aws-yaml-ansible-wordpress
        # aws-yaml-cue-eks

        # aws-yaml-eks
        # aws-yaml-static-website
    )

    for example in "${examples[@]}"; do
        post_example "$example" "$2"
    done

    exit
fi

post_example "$1" "$2"
