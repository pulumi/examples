# Use the official lightweight Ruby image.
FROM ruby:2.7-slim@sha256:39f68389fd3fe8c04ed896b10cc90ba4553a42e555ae18b37b41ea8c3ce965fd

# Install production dependencies.
WORKDIR /usr/src/app
COPY Gemfile Gemfile.lock ./
ENV BUNDLE_FROZEN=true
RUN bundle install

# Copy local code to the container image.
COPY . ./

# Run the web service on container startup.
CMD ["ruby", "./app.rb"]
