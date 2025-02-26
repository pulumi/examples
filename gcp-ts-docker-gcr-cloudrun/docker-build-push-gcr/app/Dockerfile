# Use the official lightweight Ruby image.
FROM ruby:3.4-slim@sha256:cdc00623487445d99f3de3923b97463a15e2ce9045ea679f224f361eec7512c1

# Install production dependencies.
WORKDIR /usr/src/app
COPY Gemfile Gemfile.lock ./
ENV BUNDLE_FROZEN=true
RUN bundle install

# Copy local code to the container image.
COPY . ./

# Run the web service on container startup.
CMD ["ruby", "./app.rb"]
