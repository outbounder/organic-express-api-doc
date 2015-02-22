var fs = require("fs")
var _ = require("underscore")

var dumpSuccessfulRequests = function(action){
  var result = ""
  var samples = action.success_samples
  for(var i = 0; i<samples.length; i++) {
    var sample = samples[i]
    result += [
      "### successful request",
      "",
      "```",
      sample.req.method.toUpperCase()+" "+sample.req.url,
      "headers:"+JSON.stringify(sample.req.headers, null, 2),
      "body:"+JSON.stringify(sample.req.body, null, 2),
      "```",
      "#### response",
      "```",
      "headers:"+JSON.stringify(sample.res.headers || {}, null, 2),
      "body:"+JSON.stringify(sample.res.body || {}, null, 2),
      "```",
      ""
    ].join("\n")
  }
  return result
}

var convertToCode = function(sample) {
  return {
    code: sample.res.statusCode,
    body: sample.res.body
  }
}

var dumpStatusCodes = function(action) {
  var codes = []
  if(action.success_samples.length > 0)
    codes.push({
      code: 200,
      body: "successful request body"
    })
  if(action.invalid_samples.length > 0)
    codes = codes.concat(action.invalid_samples.map(convertToCode))
  return [
    "### response codes",
    "",
    codes.map(function(c){
      if(c.code == 200)
        return "* "+c.code+" - "+c.body
      return [
        "* **"+c.code+"**",
        "  ```",
        "  body: "+JSON.stringify(c.body || {}, null, 2),
        "  ```"
      ].join("\n")
    }).join("\n"),
    ""
  ].join("\n")
}

var dumpAction = function(method, route, action){
  return [
    "## "+method.toUpperCase()+" "+route,
    "",
    dumpSuccessfulRequests(action),
    dumpStatusCodes(action)
  ].join("\n")
}

module.exports.loadAndRenderMarkdown = function(routesMapFilepath, markdownFilepath, next) {
  try{
    var routes = require(routesMapFilepath)
    var fileContent = ""
    for(var method in routes) {
      for(var route in routes[method]) {
        fileContent += dumpAction(method, route, routes[method][route])
      }
    }

    fs.writeFile(markdownFilepath, fileContent, next)
  }catch(e){
    next()
  }
}