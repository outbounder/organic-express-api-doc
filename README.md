# organic-express-api-doc

Organelle for generating documentation by runtime reflection of express mounted route handlers and their source code.

** experimental/ **

## dna

    {
      "source": "node_modules/organic-express-api-doc",
      "dna": {
        "organic-api-routes": "@processes.index.plasma.organic-api-routes"
      },
      "reactOn": ["ExpressServer"],
      "mountOn": "/api-docs",
      "docsMetadata": {
        "source": "docs/api"
      },
      "log": true,
      "liveTemplateReload": true
    }

## `dna` property

Its value is used to build organelles responsible for [express routes mounting](https://github.com/outbounder/organic-express-routes).

All organelles are expected to `reactOn` and to `emitReady`. Additionally `log: false` is applied to their corresponding dna before triggering their build.

## `docsMetadata` property

Indicates additional metadata information by default stored in markdown files where api routes are matched as follows

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
