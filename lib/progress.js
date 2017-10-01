// Keep track of how far the application has progressed during boot.

module.exports = createProgress

function createProgress (methods, graph) {
  return methods.reduce(function (progress, name) {
    progress[name] = {
      progress: 0,                         // Progress in %.
      error: null,                         // Current error.
      count: 0,                            // Amount of files contained.
      pending: graph.nodes[name].pending,  // List of nodes it waits on.
      timestamp: null                      // Latest stamp of when updated.
    }
    return progress
  }, {})
}
