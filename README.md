# organic-express-api-doc

Organelle for generating documentation by runtime reflection of express mounted route handlers and their source code.

** experimental/ **

## dna

    {
      "source": "node_modules/organic-express-api-doc",
      "dna": {
        "organic-api-routes": "@processes.index.plasma.organic-api-routes"
      },
      "mount": "/docs/api",
      "reactOn": ["ExpressServer"]
    }

## `dna` property

Its value is used to build organelles responsible for [express routes mounting](https://github.com/outbounder/organic-express-routes).

All organelles are expected to `reactOn` and to `emitReady`. Additionally `log: false` is applied to their corresponding dna before triggering their build.