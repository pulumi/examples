import sys
from awsglue.utils import getResolvedOptions
from awsglue.transforms import ApplyMapping
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.context import SparkContext

# Collect the arguments passed in by the glue.Job run.
args = getResolvedOptions(
    sys.argv,
    [
        "JOB_NAME",
        "TempDir",
        "ConnectionName",
        "GlueDBName",
        "GlueDBTableName",
        "RedshiftRoleARN",
        "RedshiftDBName",
        "RedshiftDBTableName",
    ],
)

glueContext = GlueContext(SparkContext.getOrCreate())

job = Job(glueContext)
job.init(args["JOB_NAME"], args)

# Extract all unprocessed data from the Glue catalog.
source0 = glueContext.create_dynamic_frame.from_catalog(
    database=args["GlueDBName"],
    table_name=args["GlueDBTableName"],
    additional_options={
        "jobBookmarkKeys": ["id"],
        "jobBookmarkKeysSortOrder": "asc",
    },
    transformation_ctx="source0",
)

# Transform the data (mostly just to show how to do so).
transformed0 = ApplyMapping.apply(
    frame=source0,
    mappings=[
        ("id", "int", "event_id", "int"),
        ("name", "string", "event_name", "string"),
    ],
)

# Load the data into the Redshift database.
glueContext.write_dynamic_frame.from_jdbc_conf(
    frame=transformed0,
    catalog_connection=args["ConnectionName"],
    connection_options={
        "database": args["RedshiftDBName"],
        "dbtable": args["RedshiftDBTableName"],
        "aws_iam_role": args["RedshiftRoleARN"],
    },
    redshift_tmp_dir=args["TempDir"],
)

# Call commit() to reset the job bookmark for the next run.
job.commit()
