package dns

import "examples.pulumi.com/dns/cloudflare:controller"

resources: {
	(controller.#Domain & {
		domain: "rawkode.dev"
		email:  controller.#NoEmail
	}).create

	(controller.#Domain & {
		domain: "rawkode.com"
		email:  controller.#GSuite
		records: [
			controller.#DnsRecord & {
				properties: {
					name:  "www"
					type:  "A"
					value: "1.1.1.1"
				}
			},
		]
	}).create
}
