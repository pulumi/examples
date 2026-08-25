terraform {
  required_providers {
    aws = "~> 6.0"
  }
}

# Create a bucket and expose a website index document.
resource "aws_s3_bucket" "site_bucket" {
  bucket_prefix = "s3-website-bucket"
}

resource "aws_s3_bucket_website_configuration" "site_config" {
  bucket = aws_s3_bucket.site_bucket.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "public_access_block" {
  bucket            = aws_s3_bucket.site_bucket.id
  block_public_acls = false
}

locals {
  site_dir = "www"

  content_types = {
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "text/javascript"
    ".png"  = "image/png"
  }
}

# For each file in the directory, create an S3 object stored in the bucket.
resource "aws_s3_object" "site_files" {
  for_each = fileset(local.site_dir, "**")

  bucket       = aws_s3_bucket.site_bucket.id
  key          = each.value
  source       = "${local.site_dir}/${each.value}"
  content_type = lookup(local.content_types, try(regex("\\.[^.]+$", each.value), ""), null)
}

# Set the access policy for the bucket so all objects are readable.
resource "aws_s3_bucket_policy" "bucket_policy" {
  bucket = aws_s3_bucket.site_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = "*"
      Action    = ["s3:GetObject"]
      Resource  = ["${aws_s3_bucket.site_bucket.arn}/*"]
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.public_access_block]
}

output "bucket_name" {
  value = aws_s3_bucket.site_bucket.bucket
}

output "website_url" {
  value = aws_s3_bucket_website_configuration.site_config.website_endpoint
}
