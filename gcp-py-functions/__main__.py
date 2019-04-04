import pulumi
from pulumi_gcp import storage
from pulumi_gcp import cloudfunctions
import time

# Set destination here
destination = "1525 4th Avenue #800, Seattle, WA 98101"

# Get values from Pulumi config to use as environment variables in our Cloud fxn
config = pulumi.Config(name=None)
config_values = {
    "TWILLIO_ACCESS_TOKEN": config.get("twillioAccessToken"),
    "TWILLIO_ACCOUNT_SID": config.get("twillioAccountSid"),
    "TO_PHONE_NUMBER": config.get("toPhoneNumber"),
    "FROM_PHONE_NUMBER": config.get("fromPhoneNumber"),
    "GOOGLE_MAPS_API_KEY": config.get("googleMapsApiKey"),
    "DESTINATION": destination,
}

# Create a GCP resource (Storage Bucket)
bucket = storage.Bucket('locatebucket')

# Create a Bucket Object from an Asset Archive
requirements = pulumi.FileAsset(path="./functions/requirements.txt")
asset = pulumi.FileAsset(path="./functions/locate.py")
archive = pulumi.AssetArchive(assets={
    "main.py": asset,
    "requirements.txt": requirements,
})
object = storage.BucketObject("main.py",
                              name="main.py-%f" % time.time(),
                              bucket=bucket.name,
                              source=archive)

# Create a Cloud Function
fxn = cloudfunctions.Function("locatefunction",
                              entry_point="hello_get",
                              environment_variables=config_values,
                              region="us-central1",
                              runtime="python37",
                              source_archive_bucket=bucket.name,
                              source_archive_object=object.name,
                              trigger_http=True)

# Export the DNS name of the bucket and the cloud function URL
pulumi.export('bucket_name',  bucket.url)
pulumi.export("fxn_url", fxn.https_trigger_url)
