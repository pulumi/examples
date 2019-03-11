import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create a bucket each for TPS reports and their archived zips.
const tpsReports = new aws.s3.Bucket("tpsReports");
const tpsZips = new aws.s3.Bucket("tpsZips")

// Anytime a new TPS Report is uploaded, archive it in a zipfile.
tpsReports.onObjectCreated("zipTpsReports", (e) => {
    const AdmZip = require("adm-zip");
    const ops = [];
    const s3 = new aws.sdk.S3();
    for (const rec of e.Records || []) {
        const zip = new AdmZip();
        const [ buck, key ] = [ rec.s3.bucket.name, rec.s3.object.key ];
        console.log(`Zipping ${buck}/${key} into ${tpsZips.bucket.get()}/${key}.zip`);
        const zipOp = new Promise((resolve, reject) => {
            s3.getObject(
                { Bucket: buck, Key: key },
                (err, data) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    zip.addFile(key, data.Body);
                    // console.log(`Report: ${data.ContentLength}, Zip: ${zip.toBuffer().length}`);
                    s3.putObject(
                        {
                            Bucket: tpsZips.bucket.get(),
                            Key: `${key}.zip`,
                            Body: zip.toBuffer(),
                        },
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        },
                    );
            });
        });
        ops.push(zipOp);
    }
    return Promise.all(ops).then(() => Promise.resolve());
});

// Finally, export the zipfile bucket name, for ease of access.
export const tpsReportsBucket = tpsReports.bucket;
export const tpsZipsBucket = tpsZips.bucket;
