using Pulumi;
using Pulumi.Azure.Storage;
using Pulumi.Azure.Storage.Inputs;

 public static class SharedAccessSignature
{
    public static Output<string> SignedBlobReadUrl(ZipBlob blob, Account account)
    {
        return Output
            .All<string>(account.Name, account.PrimaryConnectionString, blob.StorageContainerName, blob.Name)
            .Apply(async values =>
            {
                string accountName = values[0];
                string connectionString = values[1];
                string containerName = values[2];
                string blobName = values[3];
                var sas = await Invokes.GetAccountBlobContainerSAS(
                    new GetAccountBlobContainerSASArgs
                    {
                        ConnectionString = connectionString,
                        ContainerName = containerName,
                        Start = "2019-01-01",
                        Expiry = "2100-01-01",
                        Permissions = new GetAccountBlobContainerSASPermissionsArgs
                        {
                            Read = true,
                            Write = false,
                            Delete = false,
                            List = false,
                            Add = false,
                            Create = false,
                        },
                    }
                );
                return $"https://{accountName}.blob.core.windows.net/{containerName}/{blobName}{sas.Sas}";
            });
    }
}
