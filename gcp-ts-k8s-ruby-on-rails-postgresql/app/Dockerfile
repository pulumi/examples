FROM ruby:3.4.2@sha256:b6c3947ee95eb6bea5e331ac288beb2a48b98bb30d15353b6c5ffe2482828572
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs
RUN mkdir /myapp
WORKDIR /myapp
COPY Gemfile /myapp/Gemfile
COPY Gemfile.lock /myapp/Gemfile.lock
RUN bundle install
COPY . /myapp
CMD ["/myapp/start"]
