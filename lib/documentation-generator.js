var markedejs = require("markedejs")
var fs = require("fs")
var path = require("path")
var async = require("async")
var ejs = require("ejs")

module.exports = function(options){
  this.templatePath = options.templatePath || path.join(__dirname, "../template/index.html")
  this.metadata = options.metadata
}

module.exports.prototype.transformActionCommentsToHtml = function(doc, done){
  async.mapSeries(doc.apis, function(api, nextApi){
    async.mapSeries(api.actions, function(action, nextAction){
      markedejs.render(action.comments, {api: api, doc: doc, action: action}, function(err, html){
        if(err) return nextAction(err)
        action.comments = html
        nextAction()
      })
    }, nextApi)
  }, done)
}

module.exports.prototype.generateHtml = function(doc, done) {
  var self = this
  this.transformActionCommentsToHtml(doc, function(err){
    if(err) return done(err)
    if(!self.metadata)
      return self.render(doc, done)
    var parser = null
    if(!self.metadata.parserPath)
      parser = require("./metadata-parsers/markdown-v1")
    else
      parser = require(path.join(process.cwd(), self.metadata.parserPath))
    if(!parser)
      return done(new Error("parser not found for "+JSON.stringify(self.metadata)))
    parser.loadAndRenderMetadata(self.metadata, doc, function(err){
      if(err) return done(err)
      self.render(doc, done)
    })
  })
}

module.exports.prototype.render = function(doc, done) {
  var self = this
  fs.readFile(self.templatePath, function(err, templateData){
    if(err) return done(err)
      try {
        done(null, ejs.render(templateData.toString(), {
          doc: doc,
          filename: self.templatePath
        }))
      } catch(err){
        done(err)
      }
  })
}