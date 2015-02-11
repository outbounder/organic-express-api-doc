var Nucleus = require("organic-nucleus")
var Plasma = require("organic-plasma")
var clone = require("clone")
var async = require("async")

var ExpressDoc = require("./lib/express-app-to-documentation")
var DocGenerator = require("./lib/documentation-generator")
var populateDocsMetadata = require("./lib/populate-docs-metadata-folder")
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



module.exports = function(plasma, dna) {
  if(dna.reactOn) {
    plasma.on(dna.reactOn, function(c){
      var app = c.data || c[0].data
      var response = { html: "", generatedDocs: null}
      
      if(dna.docsMetadata && dna.docsMetadata.autopopulate) {
        app.use(populateDocsMetadata.middleware)
        plasma.on("kill", function(c, next){
          populateDocsMetadata.dumpToFile(
            path.join(
              process.cwd(), 
              dna.docsMetadata.source, 
              dna.docsMetadata.populateFilename || "api.md"
            ), next)
        })
      }

      if(dna.mountOn)
        app.get(dna.mountOn, function(req, res, next){
          if(!dna.liveTemplateReload)
            res.status(200).send(response.html)
          else
            generateHtml(response.generatedDocs, dna, function(err, html){
              if(err) return next(err)
              res.status(200).send(html)
            })
        })

      if(dna.routes)
        generateDocs(dna, function(err, docs){
          if(err) return console.error(err)
          response.generatedDocs = docs
          generateHtml(docs, dna, function(err, html){
            if(err) return console.error(err)
            if(!html) return console.error("html is not found!!!!", err, html)
            response.html = html
            if(dna.emitReady)
              plasma.emit({type: dna.emitReady, data: { docs: docs, html: html } })
            if(dna.log)
              console.info("--------------------------- generated api docs and mounted at", dna.mountOn)
          })
        })
    })
  } else
  if(dna.destinationFile) {
    generateDocs(dna, function(err, docs){
      if(err) return console.error(err)
      generateHtml(docs, dna, function(err, html){
        if(err) return console.error(err)
        if(!html) return console.error("html is not found!!!!", err, html)
        fs.writeFile(path.join(process.cwd(), dna.destinationFile), html, function(err){
          if(err) return console.error(err)
          if(dna.emitReady)
            plasma.emit({type: dna.emitReady, data: { docs: docs, html: html } })
          if(dna.log)
            console.info("--------------------------- generated api docs and saved at", dna.destinationFile)  
        })
      })
    })
  } else
    generateDocs(dna, function(err, docs){
      if(err) return console.error(err)
      if(dna.emitReady)
        plasma.emit({type: dna.emitReady, data: {docs: docs} })
      if(dna.log)
        console.info("--------------------------- generated api docs struct done")
    })
}