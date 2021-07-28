// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";
import handler from "./handler";

/**
 * api-gatewayx https://www.pulumi.com/docs/guides/crosswalk/aws/api-gateway/
 */

// Create an API endpoint.
const endpoint = new awsx.apigateway.API("hello-world", {
  routes: [
    {
      path: "/{route+}",
      method: "GET",
      // Functions can be imported from other modules
      eventHandler: handler,
    },
    {
      path: "/{route+}",
      method: "POST",
      // Functions can be created inline
      eventHandler: (event) => {
        console.log("Inline event handler");
        console.log(event);
      },
    },
    {
      path: "/{route+}",
      method: "DELETE",
      // Functions can be created inline
      eventHandler: (event) => {
        console.log("Inline delete event handler");
        console.log(event);
      },
    },
  ],
});

// Pulumi exports values
// See these outputs using: pulumi stack output endpointUrl
export const endpointUrl = endpoint.url;
