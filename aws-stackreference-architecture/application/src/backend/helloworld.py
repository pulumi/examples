from flask import Flask, request, render_template, jsonify
import pg8000
import random
import os
import requests


hash = random.getrandbits(128)

app = Flask(__name__)


@app.route('/')
def helloworld():
    return jsonify(
        message="hello world",
        hash=str(hash),
        postgres="please use the /postgres endpoint"
    )


@app.route('/postgres')
def postgres():
    conn = pg8000.connect(
        host=os.environ['DB_HOST'],
        port=int(os.environ['DB_PORT']),
        user=os.environ['DB_USERNAME'],
        password=os.environ['DB_PASSWORD'],
        database=os.environ['DB_NAME']
    )
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    results = cursor.fetchall()
    return jsonify(
        hash=str(hash),
        postgres=results
    )


@app.route('/internet')
def connect_to_internet():
    hostname = "google.com"  # example
    response = os.system("ping -c 1 " + hostname)

    # and then check the response...
    if response == 0:
        return ("I CAN connect to " + hostname)
    else:
        return ("I CAN'T connect to " + hostname)


@app.route('/env-variables')
def list_all_env_variables():
    html = ''

    for key in os.environ.keys():
        html = html + '<p>' + key + ": " + os.environ[key] + '<p>'

    return html


@app.route('/public-ip')
def get_my_public_ip():
    html = ''

    external_ip = requests.get('https://jsonip.com/').json()['ip']

    html = '<p>my external IP is: ' + \
        external_ip + ' (source: jsonip.com) </p>'

    return html


@app.route('/killme')
def kill_app():
    shutdown_server()
    return '<p>you have killed me :(<p><p>' + str(hash) + '<p>'


def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80)
