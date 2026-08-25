provider "azurerm" {
  features {}
}

variable "location" {
  type        = string
  default     = "westus"
  description = "The Azure location to deploy into"
}

resource "azurerm_resource_group" "static_site_group" {
  name     = "static-site-group${random_string.suffix.result}"
  location = var.location
}

# Storage account names must be globally unique, 3-24 lowercase alphanumeric characters.
resource "random_string" "suffix" {
  length  = 12
  special = false
  upper   = false
}

resource "azurerm_storage_account" "storage_account" {
  name                     = "site${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.static_site_group.name
  location                 = azurerm_resource_group.static_site_group.location
  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_account_static_website" "static_website" {
  storage_account_id = azurerm_storage_account.storage_account.id
  index_document     = "index.html"
  error_404_document = "404.html"
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

# Upload each file in the directory to the storage container backing the static website.
resource "azurerm_storage_blob" "site_files" {
  for_each = fileset(local.site_dir, "**")

  name                   = each.value
  storage_account_name   = azurerm_storage_account.storage_account.name
  storage_container_name = "$web"
  type                   = "Block"
  source                 = "${local.site_dir}/${each.value}"
  content_type           = lookup(local.content_types, try(regex("\\.[^.]+$", each.value), ""), null)

  depends_on = [azurerm_storage_account_static_website.static_website]
}

output "endpoint" {
  value = azurerm_storage_account.storage_account.primary_web_endpoint
}
