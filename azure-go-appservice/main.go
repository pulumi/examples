package main

import (
	"fmt"
	"strings"

	"github.com/pulumi/pulumi-azure/sdk/go/azure/appinsights"
	"github.com/pulumi/pulumi-azure/sdk/go/azure/appservice"
	"github.com/pulumi/pulumi-azure/sdk/go/azure/core"
	"github.com/pulumi/pulumi-azure/sdk/go/azure/sql"
	"github.com/pulumi/pulumi-azure/sdk/go/azure/storage"
	"github.com/pulumi/pulumi/sdk/go/pulumi"
	"github.com/pulumi/pulumi/sdk/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// use first 10 characters of the stackname as prefix for resource names
		prefix := ctx.Stack()
		if len(prefix) > 10 {
			prefix = prefix[:10]
		}

		resourceGroup, err := core.NewResourceGroup(ctx, prefix+"-rg", nil)
		if err != nil {
			return err
		}

		storageAccountName := strings.Replace(strings.ToLower(prefix), "-", "", -1) + "sa"
		storageAccount, err := storage.NewAccount(ctx, storageAccountName, &storage.AccountArgs{
			ResourceGroupName:      resourceGroup.Name,
			Location:               resourceGroup.Location,
			AccountKind:            pulumi.String("StorageV2"),
			AccountTier:            pulumi.String("Standard"),
			AccountReplicationType: pulumi.String("LRS"),
		})
		if err != nil {
			return err
		}

		appServicePlan, err := appservice.NewPlan(ctx, prefix+"-asp", &appservice.PlanArgs{
			ResourceGroupName: resourceGroup.Name,
			Location:          resourceGroup.Location,
			Kind:              pulumi.String("App"),
			Sku: appservice.PlanSkuArgs{
				Tier: pulumi.String("Basic"),
				Size: pulumi.String("B1"),
			},
		})
		if err != nil {
			return err
		}

		storageContainer, err := storage.NewContainer(ctx, prefix+"-c", &storage.ContainerArgs{
			StorageAccountName:  storageAccount.Name,
			ContainerAccessType: pulumi.String("private"),
		})
		if err != nil {
			return err
		}

		blob, err := storage.NewZipBlob(ctx, prefix+"-b", &storage.ZipBlobArgs{
			StorageAccountName:   storageAccount.Name,
			StorageContainerName: storageContainer.Name,
			Type:                 pulumi.String("block"),
			Content:              pulumi.NewFileArchive("wwwroot"),
		})
		if err != nil {
			return err
		}

		codeBlobURL := signedBlobReadURL(ctx, blob, storageAccount)

		appInsights, err := appinsights.NewInsights(ctx, prefix+"-i", &appinsights.InsightsArgs{
			ResourceGroupName: resourceGroup.Name,
			Location:          resourceGroup.Location,
			ApplicationType:   pulumi.String("Web"),
		})
		if err != nil {
			return err
		}

		username := "pulumi"

		// Get the password to use for SQL from config.
		passwd := config.New(ctx, "").Require("sqlPassword")

		sqlServer, err := sql.NewSqlServer(ctx, prefix+"-sql", &sql.SqlServerArgs{
			ResourceGroupName:          resourceGroup.Name,
			Location:                   resourceGroup.Location,
			AdministratorLogin:         pulumi.String(username),
			AdministratorLoginPassword: pulumi.String(passwd),
			Version:                    pulumi.String("12.0"),
		})
		if err != nil {
			return err
		}

		database, err := sql.NewDatabase(ctx, prefix+"-db", &sql.DatabaseArgs{
			ResourceGroupName:             resourceGroup.Name,
			Location:                      resourceGroup.Location,
			ServerName:                    sqlServer.Name,
			RequestedServiceObjectiveName: pulumi.String("S0"),
		})
		if err != nil {
			return err
		}

		app, err := appservice.NewAppService(ctx, prefix+"-as", &appservice.AppServiceArgs{
			ResourceGroupName: resourceGroup.Name,
			Location:          resourceGroup.Location,
			AppServicePlanId:  appServicePlan.ID(),
			AppSettings: pulumi.StringMap{
				"WEBSITE_RUN_FROM_ZIP":                   codeBlobURL,
				"ApplicationInsights:InstrumentationKey": appInsights.InstrumentationKey,
				"APPINSIGHTS_INSTRUMENTATIONKEY":         appInsights.InstrumentationKey,
			},
			ConnectionStrings: appservice.AppServiceConnectionStringArray{
				appservice.AppServiceConnectionStringArgs{
					Name: pulumi.String("db"),
					Value: pulumi.Sprintf("Server=tcp:%s.database.windows.net;initial catalog=%s;user ID=%s;password=%s;Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;",
						sqlServer.Name, database.Name, username, passwd),
					Type: pulumi.String("SQLAzure"),
				},
			},
		})
		if err != nil {
			return err
		}

		ctx.Export("endpoint", pulumi.Sprintf("https://%s", app.DefaultSiteHostname))
		return nil
	})
}

func signedBlobReadURL(ctx *pulumi.Context, blob *storage.ZipBlob, account *storage.Account) pulumi.StringOutput {
	// Choose a fixed, far-future expiration date for signed blob URLs. The shared access signature
	// (SAS) we generate for the Azure storage blob must remain valid for as long as the Function
	// App is deployed, since new instances will download the code on startup. By using a fixed
	// date, rather than (e.g.) "today plus ten years", the signing operation is idempotent.
	const signatureExpiration = "2100-01-01"

	return pulumi.All(account.Name, account.PrimaryConnectionString, blob.StorageContainerName, blob.Name).
		ApplyT(func(args []interface{}) (string, error) {
			accountName := args[0].(string)
			connectionString := args[1].(string)
			containerName := args[2].(string)
			blobName := args[3].(string)

			sas, err := storage.GetAccountBlobContainerSAS(ctx, &storage.GetAccountBlobContainerSASArgs{
				ConnectionString: connectionString,
				ContainerName:    containerName,
				Start:            "2019-01-01",
				Expiry:           signatureExpiration,
				Permissions:      storage.GetAccountBlobContainerSASPermissions{Read: true},
			})
			if err != nil {
				return "", err
			}
			return fmt.Sprintf("https://%s.blob.core.windows.net/%s/%s%s", accountName, containerName, blobName, sas.Sas), nil
		}).(pulumi.StringOutput)
}
