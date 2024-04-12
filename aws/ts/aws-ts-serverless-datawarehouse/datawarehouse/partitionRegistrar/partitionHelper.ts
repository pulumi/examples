// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as moment from "moment-timezone";

export const createPartitionDDLStatement = (dbName: string, tableName: string, locationPath: string, partitionKey: string, eventTime: string, hours = 12): string => {
    const date = moment(eventTime);

    let query = `ALTER TABLE ${dbName}.${tableName} ADD IF NOT EXISTS`;

    for (let i = 0; i <= hours; i++) {
        const dateString = date.utc().format("YYYY/MM/DD/HH");

        query += `\nPARTITION (${partitionKey} = '${dateString}') LOCATION '${locationPath}/${dateString}/'`;

        date.add(1, "h");
    }

    return query.concat(";");
};
