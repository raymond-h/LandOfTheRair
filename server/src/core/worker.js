
const { workerData } = require('worker_threads');
const isTS = workerData.path.includes('.ts');

if(isTS) {
  require('ts-node').register();
}

require(workerData.path);