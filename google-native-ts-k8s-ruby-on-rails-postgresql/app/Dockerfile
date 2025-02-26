FROM ruby:3.4@sha256:d780a9b44dc5e57a4968d3e4b086bbdd9b595f06d747da10b29e568386fe1dd9
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs bundler
RUN mkdir /myapp
WORKDIR /myapp
COPY Gemfile /myapp/Gemfile
COPY Gemfile.lock /myapp/Gemfile.lock
RUN bundle install
COPY . /myapp
RUN rake app:update:bin
CMD ["/myapp/start"]
