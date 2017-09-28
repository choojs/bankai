module.exports = queue

function queue (arr) {
  return arr.reduce(function (obj, method) {
    obj[method] = Queue()
    return obj
  }, {})
}

function Queue () {
  if (!(this instanceof Queue)) return new Queue()
  this._ready = false
  this._arr = []
}

Queue.prototype.add = function (cb) {
  if (!this._ready) this._arr.push(cb)
  else cb()
}

Queue.prototype.ready = function () {
  this._ready = true
  this._arr.forEach(function (fn) {
    fn()
  })
  this._arr.length = 0 // clean up internal array
}
