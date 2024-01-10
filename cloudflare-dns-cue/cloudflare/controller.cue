package controller

import "strings"

#Zone: {
	domain:       string
	resourceName: strings.Replace(domain, ".", "-", -1)
	zoneId:       "${\(resourceName).zoneId}"

	properties: {
		zone: domain
	}

	create: {
		"\(resourceName)": {
			type:         "cloudflare:Zone"
			"properties": properties
		}
	}
}

_AbstractDnsRecord: {
	zone: #Zone

	type: "cloudflare:Record"

	properties: {
		zoneId: zone.zoneId
		name:   string | *"@"
		ttl:    int | *300
		type:   "A" | "CNAME" | "MX" | "TXT"
		value:  string
	}

	create: {
		"\(zone.resourceName)-\(properties.type)-\(properties.name)": {
			"type":       type
			"properties": properties
		}
	}
}

// Lock down DnsRecords to not include MX, as these are handled by the 
// email property.
#DnsRecord: _AbstractDnsRecord & {
	properties: {
		type: "A" | "CNAME" | "TXT"
	}
}

// Allow MxRecords to have a priority
#MxRecord: _AbstractDnsRecord & {
	properties: {
		type:     "MX"
		priority: int | *10
	}
}

#NoEmail: {
	zone: #Zone

	create: {
		"\(zone.resourceName)-no-email": #DnsRecord & {
			"zone": zone

			properties: {
				name:  "@"
				type:  "TXT"
				value: "v=spf1 -all"
			}
		}
	}
}

#GSuite: {
	zone: #Zone

	create: {

		"\(zone.resourceName)-gsuite-mx-1": #MxRecord & {
			"zone": zone

			properties: {
				priority: 1
				value:    "aspmx.l.google.com"
			}
		}

		"\(zone.resourceName)-gsuite-mx-2": #MxRecord & {
			"zone": zone

			properties: {
				priority: 5
				value:    "alt1.aspmx.l.google.com"
			}
		}

		"\(zone.resourceName)-gsuite-mx-3": #MxRecord & {
			"zone": zone

			properties: {
				priority: 5
				value:    "alt2.aspmx.l.google.com"
			}
		}
	}
}

#Domain: {
	domain: string
	email:  #NoEmail | #GSuite
	records: [...#DnsRecord]

	domainZone: #Zone & {
		"domain": domain
	}

	create: {
		domainZone.create

		(email & {zone: domainZone}).create

		for _, v in records {
			(v & {zone: domainZone} ).create
		}
	}
}
