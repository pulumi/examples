import * as cloud from "@pulumi/cloud";
import * as cache from "./cache";

let app = new cloud.HttpEndpoint("urlshortener");

app.static("/", "www"); // serve all files in the "site-content" directory to the root

let urls = new cloud.Table("urls", "name");

// uncomment to use Redis cache
let urlCache = new cache.Cache("urlcache");

// GET all URLs
app.get("/urls", async (req, res) => {
    console.log("GET /urls");
    try {
        let items = await urls.scan();
        res.status(200).json(items);
    } catch (err) {
        res.status(500).json(err);
    }    
});

// GET URL by shortname
app.get("/urls/{name}", async (req, res) => {

    let name = req.params["name"];
    console.log(`GET /urls/${name}`);

    // Uncomment to use Redis cache
    let urlResult = await urlCache.get(name);
    
    if (urlResult) {
        console.log(`Retrieved value from redis: ${JSON.stringify(urlResult)}`);
        res.setHeader("X-Powered-By", "redis");
    } 
    else {
        let tableValue = await urls.get({name});
        let urlResult = tableValue ? tableValue.url : null;
    }
    

    // use table only
    // let tableValue = await urls.get({name});
    // let urlResult = tableValue ? tableValue.url : null;

    if (urlResult) {
        console.log(`GET /${name} => ${urlResult}`)
        // uncomment if using Redis cache
        urlCache.set(name, urlResult); 

        res.setHeader("Location", urlResult);
        res.status(301);
        res.end("");
    }
    else {
        res.status(404);
        res.end("");
    }
});

// POST new URL
app.post("/urls", async (req, res) => {
    let url = req.query["url"];
    let name = req.query["name"];
    console.log(`POST /urls ${url} ${name}`);

    await urls.insert({name, url});

    res.json({shortenedURLName: name});
});

app.publish().url.then(url => console.log(`Serving at: ${url}/stage`));