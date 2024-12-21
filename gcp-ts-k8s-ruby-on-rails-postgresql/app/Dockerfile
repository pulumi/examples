FROM ruby:2.5.1@sha256:ac6661b87cf49af14b193024f28ef223b529974bdfab58f5e8d4df37a8bdbc9d
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs
RUN mkdir /myapp
WORKDIR /myapp
COPY Gemfile /myapp/Gemfile
COPY Gemfile.lock /myapp/Gemfile.lock
RUN bundle install
COPY . /myapp
CMD ["/myapp/start"]
