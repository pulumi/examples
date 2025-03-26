FROM ruby:3.4.2@sha256:dadc48c65638f936d5f113d05cb79bc09a42099b51e7744afc42cd8da4f266d8
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs
RUN mkdir /myapp
WORKDIR /myapp
COPY Gemfile /myapp/Gemfile
COPY Gemfile.lock /myapp/Gemfile.lock
RUN bundle install
COPY . /myapp
CMD ["/myapp/start"]
