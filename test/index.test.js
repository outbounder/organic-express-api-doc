var chai = require("chai")
var expect = chai.expect

var Plasma = require("organic-plasma")

describe("index", function(){
  var Organelle = require("../index")

  it("works", function(done){
    var plasma = require('organic-plasma-feedback')(new Plasma())
    var app = require("express")()
    instance = new Organelle(plasma, {
      "source": "organic-express-api-doc",
      "routes": {
        "organic-api-routes": {
          "source": "organic-express-routes",
          "reactOn": ["ExpressServer"],
          "pattern": "/**/*.js",
          "path": "test/playground/actions",
          "helpers": "test/playground/action-helpers",
          "mount": "/api",
          "emitReady": "ApiRoutesReady"
        }
      },
      "reactOn": ["ExpressServer"],
      "mountOn": "/api-docs",
      "docsMetadata": {
        "source": "test/playground/docs/api"
      },
      "log": false,
      "liveTemplateReload": false,
      "emitReady": "done"
    })
    plasma.emit({
      type: "ExpressServer",
      data: app
    })
    plasma.on("done", function(c){
      expect(c.data.docs).to.exist
      expect(c.data.docs.length).to.be.equal(1)
      expect(c.data.docs[0].name).to.be.equal("organic-express-api-doc")
      expect(c.data.docs[0].version).to.exist
      expect(c.data.docs[0].apis).to.exist
      expect(c.data.docs[0].apis.length).to.be.equal(1)
      expect(c.data.html).to.exist
      done()
    })
  })

  it("stores", function(done){
    var plasma = require('organic-plasma-feedback')(new Plasma())
    var app = require("express")()
    instance = new Organelle(plasma, {
      "source": "organic-express-api-doc",
      "routes": {
        "organic-api-routes": {
          "source": "organic-express-routes",
          "reactOn": ["ExpressServer"],
          "pattern": "/**/*.js",
          "path": "test/playground/actions",
          "helpers": "test/playground/action-helpers",
          "mount": "/api",
          "emitReady": "ApiRoutesReady"
        }
      },
      "reactOn": ["ExpressServer"],
      "mountOn": "/api-docs",
      "docsMetadata": {
        "source": "test/playground/docs/api",
        "autopopulate": true,
        "renderAutopopulatedDocs": true
      },
      "log": false,
      "liveTemplateReload": false,
      "emitReady": "done"
    })
    plasma.emit({
      type: "ExpressServer",
      data: app
    })
    plasma.on("done", function(c){
      expect(c.data.docs).to.exist
      expect(c.data.docs.length).to.be.equal(1)
      expect(c.data.docs[0].name).to.be.equal("organic-express-api-doc")
      expect(c.data.docs[0].version).to.exist
      expect(c.data.docs[0].apis).to.exist
      expect(c.data.docs[0].apis.length).to.be.equal(1)
      expect(c.data.html).to.exist
      plasma.emit('kill', function () {
        done()
      })
    })
  })
})
