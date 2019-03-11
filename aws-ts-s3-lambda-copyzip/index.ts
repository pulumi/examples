import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create a bucket each for TPS reports and their archived zips.
const tpsReports = new aws.s3.Bucket("tpsReports");
const tpsZips = new aws.s3.Bucket("tpsZips")

// Anytime a new TPS Report is uploaded, archive it in a zipfile.
tpsReports.onObjectCreated("zipTpsReports", async (e) => {
    const AdmZip = require("adm-zip");
    const s3 = new aws.sdk.S3();
    for (const rec of e.Records || []) {
        const zip = new AdmZip();
        const [ buck, key ] = [ rec.s3.bucket.name, rec.s3.object.key ];
        console.log(`Zipping ${buck}/${key} into ${tpsZips.bucket.get()}/${key}.zip`);
        const data = await s3.getObject({ Bucket: buck, Key: key }).promise();
        zip.addFile(key, data.Body);
        await s3.putObject({
            Bucket: tpsZips.bucket.get(),
            Key: `${key}.zip`,
            Body: zip.toBuffer(),
        }).promise();
    }
});

// Finally, export the zipfile bucket name, for ease of access.
export const tpsReportsBucket = tpsReports.bucket;
export const tpsZipsBucket = tpsZips.bucket;
