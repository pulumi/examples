FROM cypress/included:3.4.1

WORKDIR /app

# Copy our Cypress specs, configuration and support files into the container.
ADD cypress ./cypress/
COPY cypress.json ./

# By default, run `cypress run`, which executes Cypress headlessly.
ENTRYPOINT ["cypress", "run"]
