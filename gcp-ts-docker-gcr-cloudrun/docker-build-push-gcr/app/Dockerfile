# Use the official lightweight Ruby image.
FROM ruby:3.4-slim@sha256:2864c6bfcf8fec6aecbdbf5bd7adcb8abe9342e28441a77704428decf59930fd

# Install production dependencies.
WORKDIR /usr/src/app
COPY Gemfile Gemfile.lock ./
ENV BUNDLE_FROZEN=true
RUN bundle install

# Copy local code to the container image.
COPY . ./

# Run the web service on container startup.
CMD ["ruby", "./app.rb"]
