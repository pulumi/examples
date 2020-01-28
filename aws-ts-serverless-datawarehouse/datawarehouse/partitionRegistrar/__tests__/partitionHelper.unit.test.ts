// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import { createPartitionDDLStatement } from "../partitionHelper";

test("createPartitionDDLStatement", ()=> {
    expect(createPartitionDDLStatement("someDatabase", "someTable", "somePath", "inserted_at", "2017-01-01T00:15:48Z")).toEqual(`ALTER TABLE someDatabase.someTable ADD IF NOT EXISTS
PARTITION (inserted_at = '2017/01/01/00') LOCATION 'somePath/2017/01/01/00/'
PARTITION (inserted_at = '2017/01/01/01') LOCATION 'somePath/2017/01/01/01/'
PARTITION (inserted_at = '2017/01/01/02') LOCATION 'somePath/2017/01/01/02/'
PARTITION (inserted_at = '2017/01/01/03') LOCATION 'somePath/2017/01/01/03/'
PARTITION (inserted_at = '2017/01/01/04') LOCATION 'somePath/2017/01/01/04/'
PARTITION (inserted_at = '2017/01/01/05') LOCATION 'somePath/2017/01/01/05/'
PARTITION (inserted_at = '2017/01/01/06') LOCATION 'somePath/2017/01/01/06/'
PARTITION (inserted_at = '2017/01/01/07') LOCATION 'somePath/2017/01/01/07/'
PARTITION (inserted_at = '2017/01/01/08') LOCATION 'somePath/2017/01/01/08/'
PARTITION (inserted_at = '2017/01/01/09') LOCATION 'somePath/2017/01/01/09/'
PARTITION (inserted_at = '2017/01/01/10') LOCATION 'somePath/2017/01/01/10/'
PARTITION (inserted_at = '2017/01/01/11') LOCATION 'somePath/2017/01/01/11/'
PARTITION (inserted_at = '2017/01/01/12') LOCATION 'somePath/2017/01/01/12/';`);
});
