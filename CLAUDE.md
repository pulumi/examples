# Pulumi Examples Repository - Development Guide

This repository contains hundreds of Infrastructure as Code (IaC) examples using Pulumi across multiple cloud providers and programming languages.

## Repository Architecture

### High-Level Structure
This is a monorepo containing **300+ examples** organized by cloud provider and programming language:

```
{cloud}-{language}-{example-type}/
├── aws-{go|py|ts|js|cs|fs}-{feature}/
├── azure-{go|py|ts|js|cs|fs}-{feature}/
├── gcp-{go|py|ts|js|cs|fs}-{feature}/
├── kubernetes-{go|py|ts|js|cs|fs}-{feature}/
└── testing-{integration|unit}-{language}/
```

**Supported Languages:**
- **TypeScript/JavaScript** (`ts`/`js`) - Most comprehensive coverage
- **Python** (`py`) - Second-most coverage
- **Go** (`go`) - Growing coverage, especially for AWS
- **C#** (`cs`) - .NET examples
- **F#** (`fs`) - Functional .NET examples

**Cloud Providers:**
- AWS (largest coverage)
- Azure (comprehensive)
- Google Cloud Platform (GCP)
- Kubernetes
- DigitalOcean, Equinix Metal, Linode, OVHCloud

### Project Structure Patterns

Each example follows a consistent structure:
```
example-name/
├── Pulumi.yaml           # Project definition
├── main.{go|py|ts|js}   # Infrastructure code
├── go.mod               # Go modules (Go projects)
├── package.json         # Node dependencies (TS/JS)
├── requirements.txt     # Python dependencies
├── README.md           # Usage documentation
├── app/                # Application code (if containerized)
└── .gitignore
```

### Core Architectural Patterns

1. **Infrastructure Components**: Reusable modules for common patterns
   - VPC/Network setup with public/private subnets
   - Load balancers with target groups
   - ECS/Fargate containers with ECR repositories
   - IAM roles and policies
   - Security groups with ingress/egress rules

2. **Multi-Tier Applications**: Complete application stacks
   - Web servers with databases
   - Container orchestration (ECS, EKS, AKS, GKE)
   - Serverless functions with API gateways
   - Static websites with CDNs

3. **Testing Patterns**: Comprehensive testing strategies
   - Unit tests with mocking
   - Integration tests with real deployments
   - Policy-as-Code validation

## Development Commands

### Essential Commands for Daily Development

#### Working with Individual Examples
```bash
# Navigate to an example and preview changes
cd aws-typescript-eks && pulumi preview

# Deploy an example
cd aws-typescript-eks && pulumi up

# Clean up resources
cd aws-typescript-eks && pulumi destroy

# Check stack outputs
cd aws-typescript-eks && pulumi stack output
```

#### Building and Testing
```bash
# Quick validation of code formatting and linting
make format && make lint

# Run all integration tests (4-hour timeout)
make only_test

# Run tests for specific cloud/language combination
make specific_test_set TestSet=AwsGo

# Run tests with specific tags
make specific_tag_set TagSet=aws TestSet=Go

# Test a single example
make test_example.TestAccAwsPyS3Folder

# Preview changes in PR mode (tests only changed examples)
make pr_preview
```

#### Language-Specific Linting and Formatting
```bash
# Repository-wide linting and formatting
make lint                      # Run all linting across languages
make format                    # Format all code (Python with Black)

# Python-specific
make check_python_formatting   # Validate Python formatting
make setup_python              # Setup Python virtual environment

# TypeScript linting (repository-wide)
tslint -c tslint.json **/*.ts

# Go formatting (per-project)
cd aws-go-fargate && go fmt ./...
cd aws-go-fargate && go mod tidy

# C#/.NET (per-project)
cd aws-cs-webserver && dotnet format
```

#### Testing Infrastructure
```bash
# Setup test dependencies
make ensure

# Go unit tests (specific project)
cd testing-unit-go && go test

# Python unit tests
cd testing-unit-py && python -m pytest

# TypeScript unit tests
cd testing-unit-ts/mocha && npm test
```

### CI/CD Workflows

The repository uses GitHub Actions with several specialized workflows:

#### Main Test Workflow (`test-examples.yml`)
- **TypeScript Linting**: `tslint` validation across all TS files
- **Unit Tests**: Language-specific unit test execution
- **Python Formatting**: Black code formatting validation
- **Integration Tests**: Matrix testing across cloud providers and languages
  - Platforms: AWS, Azure, GCP, DigitalOcean, Equinix Metal
  - Languages: Go, Python, TypeScript, JavaScript, C#, F#
- **Kubernetes Tests**: Specialized K8s testing with Minikube

#### PR Preview Workflow
- Detects changed examples vs base branch
- Automatically seeds missing configuration with safe placeholders
- Runs `pulumi preview` on changed examples only
- Supports multiple runtime detection (Node.js, Python, Go, .NET, YAML)

### Testing Architecture

#### Integration Testing Framework
Located in `misc/test/`, the testing system:

1. **Test Definitions**: Structured test configuration in `definitions/`
   - Tagged by language and cloud provider
   - Uses Pulumi's `integration.ProgramTestOptions`
   - Supports parallel execution (40 parallel tests)

2. **Test Execution**:
   - Go-based test runner with `gotestfmt` formatting
   - 4-hour timeout for full test suite
   - Comprehensive cloud provider authentication

3. **Test Categories**:
   - **Unit Tests**: Mock-based testing with `pulumi.WithMocks()`
   - **Integration Tests**: Deploy-check-destroy lifecycle
   - **Policy Tests**: Policy-as-Code validation

#### Example Unit Test Pattern (Go)
```go
// Mock resource creation
func (mocks) NewResource(args pulumi.MockResourceArgs) (string, resource.PropertyMap, error) {
    outputs := args.Inputs.Mappable()
    if args.TypeToken == "aws:ec2/instance:Instance" {
        outputs["publicIp"] = "203.0.113.12"
    }
    return args.Name + "_id", resource.NewPropertyMapFromMap(outputs), nil
}

// Test infrastructure properties
func TestInfrastructure(t *testing.T) {
    err := pulumi.RunErr(func(ctx *pulumi.Context) error {
        infra, err := createInfrastructure(ctx)
        // Assert expected properties
        pulumi.All(infra.server.Tags).ApplyT(func(tags interface{}) error {
            assert.Contains(t, tags, "Name")
            return nil
        })
        return err
    }, pulumi.WithMocks("project", "stack", mocks(0)))
    assert.NoError(t, err)
}
```

### Development Workflow

#### Before Working on Examples
1. **Prerequisites Setup**:
   - Configure cloud provider credentials (AWS CLI, Azure CLI, gcloud)
   - Install language-specific tools (Node.js, Python, Go, .NET)
   - Run `pulumi login` to authenticate with Pulumi

2. **Working with Existing Examples**:
   - Navigate to example directory: `cd aws-typescript-eks`
   - Install dependencies: `npm install` (or language equivalent)
   - Configure stack: `pulumi config set aws:region us-west-2`
   - Preview: `pulumi preview`
   - Deploy: `pulumi up`
   - Clean up: `pulumi destroy`

#### Adding New Examples
1. **Naming and Structure**:
   - Follow `{cloud}-{language}-{feature}` naming convention
   - Create directory with standard structure (see Project Structure Patterns above)
   - Include comprehensive README with deployment steps

2. **Testing Integration**:
   - Add test definitions to `misc/test/definitions/`
   - Tag appropriately for CI matrix execution
   - Test locally before submitting PR

3. **Code Quality**:
   - Run language-specific linting and formatting
   - Ensure example works with `pulumi preview` and `pulumi up`
   - Include proper resource tagging and cleanup

#### PR Workflow
- Run `make pr_preview` to test only changed examples
- Automatic linting and formatting validation
- Integration tests run on maintainer approval
- Use `make format && make lint` before committing

## Key Dependencies and Tools

### Core Infrastructure
- **Pulumi SDK**: v3.x across all languages
- **Cloud Provider SDKs**: AWS SDK v7, Azure SDK, GCP SDK
- **Docker**: For containerized examples

### Testing and CI
- **gotestfmt**: Go test output formatting
- **pytest**: Python testing framework
- **Mocha**: TypeScript/JavaScript testing
- **tslint**: TypeScript linting
- **Black**: Python code formatting

### Development Tools
- **Node.js 20**: TypeScript/JavaScript runtime
- **Python 3.9+**: Python runtime
- **Go 1.21+**: Go runtime
- **Helm**: Kubernetes package management
- **kubectl**: Kubernetes CLI

## Common Development Issues

### Authentication Problems
- **Cloud Provider Credentials**: Ensure AWS CLI, Azure CLI, or gcloud is configured
- **Pulumi Backend**: Run `pulumi login` to authenticate with Pulumi service
- **Permission Errors**: Check IAM roles have sufficient permissions for resource creation

### Resource Conflicts
- **Stack State**: Use unique stack names to avoid conflicts: `pulumi stack select dev-yourname`
- **Resource Names**: Many examples use randomized names to avoid conflicts
- **Region Conflicts**: Configure appropriate regions: `pulumi config set aws:region us-west-2`

### Testing Issues
- **Long Test Times**: Full integration tests take up to 4 hours - use `make pr_preview` for quick validation
- **Parallel Test Failures**: Tests run 40 in parallel - occasional timeouts are expected
- **Resource Cleanup**: Always run `pulumi destroy` after testing to avoid costs

## Architecture Insights

This repository demonstrates several key IaC architectural patterns:

1. **Multi-Cloud Abstraction**: Examples show similar patterns across cloud providers
2. **Language Polyglot**: Same infrastructure patterns implemented across multiple programming languages
3. **Component Reusability**: Higher-level components built from cloud primitives
4. **Testing Strategy**: Comprehensive unit, integration, and policy testing
5. **CI/CD Integration**: Automated testing and validation at scale

The testing infrastructure alone processes hundreds of examples across multiple cloud providers, languages, and test types, making it one of the most comprehensive IaC testing frameworks available.