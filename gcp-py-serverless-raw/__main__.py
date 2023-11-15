from pulumi_gcp import storage, cloudfunctions
from pulumi import export, asset

bucket = storage.Bucket("bucket", location="US")

py_bucket_object = storage.BucketObject(
    "python-zip",
    bucket=bucket.name,
    source=asset.AssetArchive({
        ".": asset.FileArchive("./pythonfunc")
    }))

py_function = cloudfunctions.Function(
    "python-func",
    source_archive_bucket=bucket.name,
    runtime="python37",
    source_archive_object=py_bucket_object.name,
    entry_point="handler",
    trigger_http=True,
    available_memory_mb=128,
)

py_invoker = cloudfunctions.FunctionIamMember(
    "py-invoker",
    project=py_function.project,
    region=py_function.region,
    cloud_function=py_function.name,
    role="roles/cloudfunctions.invoker",
    member="allUsers",
)

export("python_endpoint", py_function.https_trigger_url)

go_bucket_object = storage.BucketObject(
    "go-zip",
    bucket=bucket.name,
    source=asset.AssetArchive({
        ".": asset.FileArchive("./gofunc")
    }))

go_function = cloudfunctions.Function(
    "go-func",
    source_archive_bucket=bucket.name,
    runtime="go120",
    source_archive_object=go_bucket_object.name,
    entry_point="Handler",
    trigger_http=True,
    available_memory_mb=128,
)

go_invoker = cloudfunctions.FunctionIamMember(
    "go-invoker",
    project=go_function.project,
    region=go_function.region,
    cloud_function=go_function.name,
    role="roles/cloudfunctions.invoker",
    member="allUsers",
)

export("go_endpoint", go_function.https_trigger_url)
