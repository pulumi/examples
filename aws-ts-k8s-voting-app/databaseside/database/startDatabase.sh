#!/bin/bash
set -exu
FILE=/persistentVolume/postgresqlDb/postgresql.conf

chown postgres:postgres /persistentVolume

if test -f "$FILE"; then
    echo "/persistentVolume already contains postgresqlDb, no need to initialize database."
else
    echo "/persistentVolume is empty, and we need to initialize the postgresql database."
    cd /persistentVolume
    su postgres -c "/usr/lib/postgresql/10/bin/initdb -D /persistentVolume/postgresqlDb"
    
    echo "host all  all    0.0.0.0/0  md5" >> /persistentVolume/postgresqlDb/pg_hba.conf
    echo "host all  all    ::/0       md5" >> /persistentVolume/postgresqlDb/pg_hba.conf
    echo "listen_addresses='*'" >> /persistentVolume/postgresqlDb/postgresql.conf

    su postgres -c "/usr/lib/postgresql/10/bin/pg_ctl -D /persistentVolume/postgresqlDb --wait -l logfile start"
    
    set +x
    echo "psql -U postgres -c \"CREATE ROLE $ADMIN_NAME LOGIN SUPERUSER PASSWORD '*********';\""
    echo "psql -U postgres -c \"ALTER ROLE `postgres` WITH NOLOGIN\";"
    psql -U postgres -c "CREATE ROLE $ADMIN_NAME LOGIN SUPERUSER PASSWORD '$ADMIN_PASSWORD';"
    psql -U postgres -c "ALTER ROLE `postgres` WITH NOLOGIN;"

    set -x
    su postgres -c "/usr/lib/postgresql/10/bin/pg_ctl -D /persistentVolume/postgresqlDb --wait -l logfile stop"
fi

su postgres -c "/usr/lib/postgresql/10/bin/postgres -D /persistentVolume/postgresqlDb"
