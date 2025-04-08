FROM ruby:3.4@sha256:4a9f0adda96c4f20c0e3d3e2ccd675b147d1663a64ea23b143fc3c4ecfef57de
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs bundler
RUN mkdir /myapp
WORKDIR /myapp
COPY Gemfile /myapp/Gemfile
COPY Gemfile.lock /myapp/Gemfile.lock
RUN bundle install
COPY . /myapp
RUN rake app:update:bin
CMD ["/myapp/start"]
