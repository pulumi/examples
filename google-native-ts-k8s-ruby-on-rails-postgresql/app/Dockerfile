FROM ruby:2.5@sha256:ecc3e4f5da13d881a415c9692bb52d2b85b090f38f4ad99ae94f932b3598444b
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs bundler
RUN mkdir /myapp
WORKDIR /myapp
COPY Gemfile /myapp/Gemfile
COPY Gemfile.lock /myapp/Gemfile.lock
RUN bundle install
COPY . /myapp
RUN rake app:update:bin
CMD ["/myapp/start"]
