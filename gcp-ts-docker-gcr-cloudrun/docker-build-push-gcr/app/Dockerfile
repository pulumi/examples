# Use the official lightweight Ruby image.
FROM ruby:3.4-slim@sha256:7f13f26e3f0e74b2e618df5afd9d3de44b3eb62c3dfc40d017a5d2c9d9e9c5e5

# Install production dependencies.
WORKDIR /usr/src/app
COPY Gemfile Gemfile.lock ./
ENV BUNDLE_FROZEN=true
RUN bundle install

# Copy local code to the container image.
COPY . ./

# Run the web service on container startup.
CMD ["ruby", "./app.rb"]
