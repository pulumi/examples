#!/bin/bash
set -exu
FILE=/persistentVolume/mongod.lock

if test -f "$FILE"; then
    echo "/persistentVolume already contains MongoDB, no need to initialize database."
    mongod --fork --dbpath /persistentVolume/ --bind_ip_all --logpath /persistentVolume/mongoLogs
else
    echo "/persistentVolume is empty, and we need to initialize the MongoDB database."
    mongod --fork --dbpath /persistentVolume/ --bind_ip_all --logpath /persistentVolume/mongoLogs
    echo "use $DATABASE_NAME
    db.choices.insert({ _id: 0, text: \"Tabs\", vote_count: 0 })
    db.choices.insert({ _id: 1, text: \"Spaces\", vote_count: 0 })
    db.createUser(
        {
            user: \"$USER_NAME\",
            pwd: \"$USER_PASSWORD\",
            roles: [ { role: \"readWrite\", db: \"$DATABASE_NAME\" } ]
        }
    )" | mongo
fi

while true; do
    sleep 3600
done
