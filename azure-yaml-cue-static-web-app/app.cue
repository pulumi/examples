package main

resources: {
	(#StaticWebApp & {
		_name: "rawkode"
	}).resources

	(#StaticWebApp & {
		_name: "stack72"
		_documents: {
			root:  "website"
			index: "index.html"
		}
	}).resources
}

#StaticWebApp: {
	_name: string
	_documents: {
		root:     string | *"website"
		index:    string | *"index.html"
		error404: string | *"404.html"
	}

	resources: {
		"\(_name)-group": {
			type: "azure-native:resources:ResourceGroup"
			properties: {
				location: "WestUs"
			}
		}

		"\(_name)-storage": {
			type: "azure-native:storage:StorageAccount"
			properties: {
				resourceGroupName: "${\(_name)-group.name}"
				kind:              "StorageV2"
				sku: {
					name: "Standard_LRS"
				}
			}
		}

		"\(_name)-website": {
			type: "azure-native:storage:StorageAccountStaticWebsite"
			properties: {
				resourceGroupName: "${\(_name)-group.name}"
				accountName:       "${\(_name)-storage.name}"
				indexDocument:     "\(_documents.index)"
				error404Document:  "\(_documents.error404)"
			}
		}

		"\(_name)-\(_documents.index)": {
			type: "azure-native:storage:Blob"
			properties: {
				resourceGroupName: "${\(_name)-group.name}"
				accountName:       "${\(_name)-storage.name}"
				containerName:     "${\(_name)-website.containerName}"
				contentType:       "text/html"
				type:              "Block"
				source: {
					"Fn::FileAsset": "./\(_documents.root)/\(_documents.index)"
				}
			}
		}
	}
}
