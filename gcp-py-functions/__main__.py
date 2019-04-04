import pulumi
from pulumi_gcp import storage
from pulumi_gcp import cloudfunctions

bucket = storage.Bucket('locatebucket')

asset = pulumi.FileAsset(path="./functions/locate.py")
archive = pulumi.AssetArchive(assets={
    "main.py": asset
})
object = storage.BucketObject("main.py",
                              name="main.py",
                              bucket=bucket.name,
                              source=archive)

# Create a GCP resource (Storage Bucket)

# Export the DNS name of the bucket
pulumi.export('bucket_name',  bucket.url)


fxn = cloudfunctions.Function("locatefunction",
                              opts=None,
                              available_memory_mb=None,
                              description=None,
                              entry_point="hello_get",
                              environment_variables=None,
                              event_trigger=None,
                              https_trigger_url=None,
                              labels=None,
                              name=None,
                              project=None,
                              region="us-central1",
                              runtime="python37",
                              service_account_email=None,
                              source_archive_bucket=bucket.name,
                              source_archive_object=object.name,
                              source_repository=None,
                              timeout=None,
                              trigger_http=True,
                              __name__=None,
                              __opts__=None)

pulumi.export("fxn_url", fxn.https_trigger_url)
