import time, redis
from environs import Env

from flask import Flask

app = Flask(__name__)
env = Env()

redis_host = env("REDIS_HOST")
redis_port = env.int("REDIS_PORT")
cache = redis.Redis(host=redis_host, port=redis_port)


def get_hit_count():
    retries = 5
    while True:
        try:
            return cache.incr('hits')
        except redis.exceptions.ConnectionError as exc:
            if retries == 0:
                raise exc
            retries -= 1
            time.sleep(0.5)

@app.route('/')
def hello():
    count = get_hit_count()  
    return 'I have been viewed {} times.\n'.format(count)