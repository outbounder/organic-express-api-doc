var Nucleus = require("organic-nucleus")
var Plasma = require("organic-plasma")
var clone = require("clone")
var async = require("async")

var ExpressDoc = require("./lib/express-app-to-documentation")
var DocGenerator = require("./lib/documentation-generator")
var populateDocsMetadata = require("./lib/populate-docs-metadata")
var populatedDocsRender = require("./lib/render-docs-metadata")
var fs = require("fs")
var path = require("path")

var acquireOrganelleDNA = function(dna){
  var result = clone(dna)
  result.reactOn = "document"
  result.emitReady = "documentDone"
  result.log = false
  return result
}

var generateDocs = function(dna, done){
  var results = []

  // construct and execute documenting tasks in async series
  var tasks = []
  for(var key in dna.routes){
    tasks.push({
      dna: acquireOrganelleDNA(dna.routes[key])
    })
  }
  async.eachSeries(tasks, function(task, nextTask){
    // build task's dna as Organelle using Express based Chemical to reac on
    var subplasma = new Plasma()
    var nucleus = new Nucleus(subplasma, {})
    nucleus.build(task.dna)

    // fake Express Server
    var fakeExpress = new ExpressDoc(dna)

    // listen once Organelle is ready
    subplasma.on("documentDone", function(){
      results.push(fakeExpress.generateDocumentation())
      nextTask()
    })

    // trigger Organelle's responsibility
    subplasma.emit({
      type: "document",
      data: fakeExpress
    })  
  }, function(err){
    // once all organelles completed
    if(err) return done(err)
    done(null, results)
  })
}

var generateHtml = function(docs, dna, next){
  if(docs.length != 1) {
    return next("not implemented yet!")
  }
  var g = new DocGenerator({
    templatePath: dna.templatePath,
    metadata: dna.docsMetadata
  })
  g.generateHtml(docs[0], next)
}

var buildDocs = function(plasma, dna, responseBuffer){
  generateDocs(dna, function(err, docs){
    if(err) return console.error(err)
    responseBuffer.generatedDocs = docs
    generateHtml(docs, dna, function(err, html){
      if(err) return console.error(err)
      if(!html) return console.error("html is not found!!!!", err, html)
      responseBuffer.html = html
      if(dna.emitReady)
        plasma.emit({type: dna.emitReady, data: { docs: docs, html: html } })
      if(dna.log)
        console.info("--------------------------- generated api docs and mounted at", dna.mountOn)
    })
  })
}

module.exports = function(plasma, dna) {
  if(dna.reactOn) {
    plasma.on(dna.reactOn, function(c){
      var app = c.data || c[0].data
      var responseBuffer = { html: "", generatedDocs: null}
      
      if(dna.docsMetadata) {
        if(!dna.docsMetadata.populateFilename)
          dna.docsMetadata.populateFilename = "api.md"
        dna.docsMetadata.jsonStoreFilepath = path.join(
          process.cwd(), 
          dna.docsMetadata.source, 
          dna.docsMetadata.populateFilename+".json"
        )
        dna.docsMetadata.markdownFilepath = path.join(
          process.cwd(), 
          dna.docsMetadata.source, 
          dna.docsMetadata.populateFilename
        )
        if(dna.docsMetadata.autopopulate) {
          populateDocsMetadata.loadFileDump(dna.docsMetadata.jsonStoreFilepath)
          app.use(populateDocsMetadata.middleware)
          plasma.on("kill", function(c, next){
            populateDocsMetadata.dumpToFile(dna.docsMetadata.jsonStoreFilepath, next)
          })
        }
      }

      if(dna.mountOn)
        app.get(dna.mountOn, function(req, res, next){
          if(!dna.liveTemplateReload)
            res.status(200).send(responseBuffer.html)
          else
            generateHtml(responseBuffer.generatedDocs, dna, function(err, html){
              if(err) return next(err)
              res.status(200).send(html)
            })
        })

      if(dna.routes) {
        if(dna.docsMetadata && dna.docsMetadata.renderAutopopulatedDocs) {
          populatedDocsRender.loadAndRenderMarkdown(
            dna.docsMetadata.jsonStoreFilepath, 
            dna.docsMetadata.markdownFilepath, 
            function(err){
              if(err) return console.error(err)
              console.info(dna.docsMetadata.markdownFilepath, "markdown docs updated")
              buildDocs(plasma, dna, responseBuffer)
            })
        } else
          buildDocs(plasma, dna, responseBuffer)
      }
    })
  }
}