# Use the official lightweight Ruby image.
FROM ruby:3.4-slim@sha256:98e208daf93d40485edf2f5e1a1527202ae0824cdc1619b6659674a84aa197ba

# Install production dependencies.
WORKDIR /usr/src/app
COPY Gemfile Gemfile.lock ./
ENV BUNDLE_FROZEN=true
RUN bundle install

# Copy local code to the container image.
COPY . ./

# Run the web service on container startup.
CMD ["ruby", "./app.rb"]
