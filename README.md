# organic-express-api-doc v0.3.0

Organelle for generating documentation by runtime reflection of express mounted route handlers and their source code.

## dna

    {
      "source": "node_modules/organic-express-api-doc",
      "reactOn": ["ExpressServer"],
      "mountOn": "/api-docs",
      "routes": {
        "organic-api-routes": "@processes.index.plasma.organic-api-routes"
      },
      "docsMetadata": {
        "source": "docs/api",
        "autopopulate": false,
        "renderAutopopulatedDocs": false,
        "populateFilename": "api.md"
      },
      "log": false,
      "liveTemplateReload": false
    }

## `routes` property

Its value is used to build organelles responsible for [express routes mounting](https://github.com/outbounder/organic-express-routes).

**All organelles are expected to `reactOn` and to `emitReady`. Additionally `log: false` is applied to their corresponding dna before triggering their build.**

## `docsMetadata` property

Indicates additional metadata information by default stored in markdown files where api routes are matched as follows

    ... any markdown content ...
    ## METHOD route
    ... markdown content for api action
    ...

So for example given the markdown bellow:

    # markdown file title

    ## GET /api/resource

    this text will be merged as description for `GET /api/resource` action,
    other supported methods are "POST", "PUT", "DELETE" and "ALL"

    ## PUT /api/resource/:url_param ? :query_params

    example markdown metadata description for action with url and query params.

    ### url params

    * :url_param

    ### query params

    * :query_params

Will be extracted metadata information for the following routes:

* GET /api/resource
* PUT /api/resource/:url_param

**Notice** that methods and urls should exactly match to your mounted express route handlers (case sensitive ;)

### `autopopulate` property

When enabled will intercept all incoming requests and their responses and upon `kill` chemical will dump at `dna.docsMetadata` `{.source} \ {.populateFilename}.json` json data documentation with samples 'schemified'.

### `renderAutopopulatedDocs` property

When enabled will load and render `dna.docsMetadata` `{.source} \ {.populateFilename}.json` json data documentation into `dna.docsMetadata` `{.source} \ {.populateFilename}` markdown file suitable
for parsing by docsMetadata pipeline.

*Noteice* that this happens when the organelle is constructed, therefore it won't output anything if the json file is missing.


## under-the-hood

### the concept

#### sampling routes

0. load `sampled routes metadata` if exists
1. intercept all incoming http requests and their respective responses
2. convert their properties (`headers`, `body`, ...) to a schema-like structures
3. consolidate requests/responses into samples per `method` : `route`
4. store `sampled routes metadata`

#### structure routes map

1. intercept Express app's mount methods (`all`, `get`, `post`, ...)
2. analyze the handlers passed
3. stored `sampled routes metadata` is loaded and trasnformed to markdown file
4. load markdown files and transform them to `routes metadata`
5. generate `in-memory documentation structure` of analyzed routes forming their respective apis with their `routes metadata`

#### documentation rendering

1. mount route handler on Express app
2. respond with `in-memory documentation structure` transformed as `html+css+js` to incoming requests
