# organic-express-api-doc v0.0.1

Organelle for generating documentation by runtime reflection of express mounted route handlers and their source code.

** experimental **

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

When set to true will intercept all incoming requests and their responses and upon `kill` chemical will dump at `metaData .source \ .populateFilename` markdown documentation with sample snippets.

## tips & tricks

### generate docs from command line via orgnaic-angel

using [angelabilities-reactions]() adding this dna snippted will generate docs for your runtime generated routes via

    $ angel build docs

The snippet:

    {
      "reactions": {
        ...
        "build docs": {
          "emit": {
            "type": "build",
            "source": "node_modules/organic-express-api-doc",
            "dna": {
              "organic-api-routes": "@processes.index.plasma.organic-api-routes"
            },

            "destinationFile": "/docs/api.html",

            "docsMetadata": {
              "source": "docs/api"
            },
            "log": true
          }
        },
        "build": {
          "do": [..., "build docs"]
        }
      }
    }

## under-the-hood

1. creates a fake Express App object for runtime code reflection of handlers
2. isolates given organelles for mounting express routes and triggers their `reactOn` implementation
3. constructs ordered data structure:

    * Documentation
      * Api
        * Action
          * method
          * url
          * handlers
          * comments
          * metadata

4. Uses that structure to generate html passing it to ejs based template engine.