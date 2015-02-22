var fs = require('fs')
var BufferRes = require('express-buffer-response')
var url = require("url")
var _ = require("underscore")
var DNA = require("organic-dna")
var fold = require("organic-dna-fold")

var deepExtend = require("deep-extend")

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

var capitaliseFirstLetter = function(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

var schemify = function(data, level) {
  if(Array.isArray(data) && level < 3) {
    var schemified = data.map(function(d){
      return schemify(d, level)
    })
    var uniq = _.uniq(schemified, function(item){
      return JSON.stringify(item)
    })
    if(typeof uniq[0] == "object") {
      var result = {}
      uniq.forEach(function(item){ deepExtend(result, item) })
      return [result]
    } else
      return uniq
  } else
  if(typeof data == "object" && level < 3) {
    for(var key in data) {
      data[key] = schemify(data[key], level+1)
    }
    return data
  } else
  return capitaliseFirstLetter(typeof data)
}

var schemifyAndUpdate = function(sample, samples) {
  sample.req.headers = schemify(sample.req.headers, 0)
  sample.req.body = schemify(sample.req.body, 0)
  sample.res.headers = schemify(sample.res.headers, 0)
  sample.res.body = schemify(sample.res.body, 0)
  var found = _.find(samples, function(r){
    if(Array.isArray(r.res.body) && Array.isArray(sample.res.body)){
      return true
    } else
      return typeof r.res.body == typeof sample.res.body && !Array.isArray(r.res.body)
  })
  
  if(!found)
    return samples.push(sample)
  
  if(found.req.url != sample.req.url)
    found.req.url = aggregateReqPath(found.req.url, sample.req.url)
  found.req.method = sample.req.method
  deepExtend(found.req.headers, sample.req.headers)
  deepExtend(found.req.body, sample.req.body)
  deepExtend(found.res.headers, sample.res.headers)
  deepExtend(found.res.body, sample.res.body)
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
  try {
    res_body = JSON.parse(res_body)
  } catch(err){
    res_body = "..."
  }
  var sample = {
    req: {
      url: req.url,
      method: req.method,
      headers: JSON.parse(JSON.stringify(req.headers || {})),
      body: JSON.parse(JSON.stringify(req.body || {}))
    },
    res: {
      headers: JSON.parse(JSON.stringify(res._headers || {})),
      body: res_body,
      statusCode: res.statusCode
    }
  }
  if(res.statusCode == 200)
    schemifyAndUpdate(sample, routes_map[req.method][req.route.path].success_samples)
  else
    schemifyAndUpdate(sample, routes_map[req.method][req.route.path].invalid_samples)
}

module.exports.middleware = function(req, res, next){
  BufferRes(res, function(err, res_body){
    remember(req, res, res_body.toString())
  })
  next()
}

module.exports.loadFileDump = function(filepath) {
  try {
    routes_map = require(filepath)
  } catch(e) {
    routes_map = {}
  }
}

module.exports.dumpToFile = function(filepath, next) {
  fs.writeFile(filepath, JSON.stringify(routes_map), next)
}