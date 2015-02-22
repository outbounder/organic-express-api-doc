var fs = require('fs')
var BufferRes = require('express-buffer-response')
var url = require("url")
var _ = require("underscore")
var deepExtend = require('deep-extend')

var routes_map = {/*
  "method" : {
    "route": {
      success_samples: [{
        req: {
          url: String,
          method: String,
          headers: {...},
          body: {...}
        },
        res: {
          headers: {...},
          body: {...},
          statusCode: Number
        }
      }],
      invalid_samples: [...]
    }
  }
*/}

var aggregateReqPath = function(currentPath, newPath) {
  var currentParts = url.parse(currentPath, true)
  var newParts = url.parse(newPath, true)
  var result = _.extend({}, currentParts, newParts)
  return url.format(result)
}

function capitaliseFirstLetter(string)
{
  return string.charAt(0).toUpperCase() + string.slice(1)
}

var schemify = function(data) {
  if(Array.isArray(data)) {
    return _.uniq(data.map(schemify))
  } else
  if(typeof data == "object") {
    for(var key in data) {
      data[key] = schemify(data[key])
    }
    return data
  } else
  return capitaliseFirstLetter(typeof data)
}

var consolidateSuccessSamples = function(samples) {
  var emptyResult = {
    req: {
      url: "",
      method: "",
      headers: {},
      body: {}
    },
    res: {
      headers: {},
      body: undefined
    }
  }
  var results = []
  for(var i = 0; i<samples.length; i++) {
    var sample = samples[i]
    var result = _.find(results, function(r){
      if(Array.isArray(sample.res.body) && Array.isArray(r.res.body))
        return true
      return typeof r.res.body == typeof sample.res.body && !Array.isArray(r.res.body)
    })
    if(!result) {
      result = {}
      deepExtend(result, emptyResult)
      result.res.body = sample.res.body
      results.push(result)
    }
    if(sample.req.url != result.req.url)
      result.req.url = aggregateReqPath(result.req.url, sample.req.url)
    result.req.method = sample.req.method
    deepExtend(result.req.headers, sample.req.headers)
    deepExtend(result.req.body, sample.req.body)
    deepExtend(result.res.headers, sample.res.headers)
    deepExtend(result.res.body, sample.res.body)
  }
  for(var i = 0; i<results.length; i++) {
    var result = results[i]
    result.req.headers = schemify(result.req.headers)
    result.req.body = schemify(result.req.body)
    result.res.headers = schemify(result.res.headers)
    result.res.body = schemify(result.res.body)
  }
  return results
}

var consolidateInvalidSamples = function(samples) {
  var results = [/*{
    code: Number,
    body: Object
  }*/]
  for(var i = 0; i<samples.length; i++) {
    var sample = samples[i]
    var result = _.find(results, function(r){return r.code == sample.res.statusCode})
    if(!result) {
      results.push({
        code: sample.res.statusCode,
        body: sample.res.body
      })
    } else 
      deepExtend(result.body, sample.res.body)
  }
  return results
}

var dumpSuccessfulRequests = function(action){
  var result = ""
  var samples = consolidateSuccessSamples(action.success_samples)
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

var dumpStatusCodes = function(action) {
  var codes = []
  if(action.success_samples.length > 0)
    codes.push({
      code: 200,
      body: "successful request body"
    })
  if(action.invalid_samples.length > 0)
    codes = codes.concat(consolidateInvalidSamples(action.invalid_samples))
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

var remember = function(req, res, res_body) {
  if(!req.route)
    return
  if(!routes_map[req.method])
    routes_map[req.method] = {}
  if(!routes_map[req.method][req.route.path])
    routes_map[req.method][req.route.path] = {
      success_samples: [],
      invalid_samples: []
    }

  var samples
  if(res.statusCode == 200)
    samples = routes_map[req.method][req.route.path].success_samples
  else
    samples = routes_map[req.method][req.route.path].invalid_samples

  try {
    res_body = JSON.parse(res_body)
  } catch(err){
    res_body = "..."
  }

  samples.push({
    req: {
      url: req.url,
      method: req.method,
      headers: req.headers,
      body: JSON.parse(JSON.stringify(req.body))
    },
    res: {
      headers: res.headers,
      body: res_body,
      statusCode: res.statusCode
    }
  })
}

module.exports.middleware = function(req, res, next){
  BufferRes(res, function(err, res_body){
    remember(req, res, res_body.toString())
  })
  next()
}

module.exports.dumpToFile = function(filepath, next) {
  var fileContent = ""
  for(var method in routes_map) {
    for(var route in routes_map[method]) {
      fileContent += dumpAction(method, route, routes_map[method][route])
    }
  }

  fs.writeFile(filepath, fileContent, next)
}