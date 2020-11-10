import { worker } from 'cluster';

require('dotenv').config();

const path = require('path');
const { Worker, isMainThread } = require('worker_threads');

const isProd = process.env.NODE_ENV === 'production';
const workerExt = isProd ? 'js' : 'ts';

if (isMainThread) {

  const workers: any = {
    net: null,
    gameloop: null
  };

  const pids: any = {
    net: 0,
    gameloop: 0
  };

  const netWorker = new Worker(path.join(__dirname, 'worker.js'), { workerData: { path: `${__dirname}/networking.${workerExt}` } });
  const gameWorker = new Worker(path.join(__dirname, 'worker.js'), { workerData: { path: `${__dirname}/gameloop.${workerExt}` } });

} else {

}

/*
import 'reflect-metadata';

import cluster from 'cluster';
import { cpus } from 'os';

import { GameloopWorker } from './gameloop';
import { WebsocketWorker } from './networking';

// TODO: sometimes, in dev mode, this does not start. for seemingly no reason.

const isProd = process.env.NODE_ENV === 'production';

const isSingleMode = process.argv.includes('--single-core') || process.env.SINGLE_CORE;
const processors = cpus().length;

const gameStart = () => {
  const worker = new GameloopWorker();
  console.log('CORE', 'Start game...');
  worker.start();
};

const netStart = () => {
  const worker = new WebsocketWorker();
  console.log('CORE', 'Start net...');
  worker.start();
};

if (cluster.isMaster) {
  console.log(isProd ? 'Production mode starting.' : 'Development mode starting.');

  if (isSingleMode || processors < 4) {
    console.log('CORE', 'Starting in single-core mode.', processors < 4 ? 'Not enough processors (need 4).' : '');

    netStart();
    gameStart();

  } else {
    console.log('CORE', 'Starting in normal multi-core mode.');

    const workers: any = {
      net: null,
      gameloop: null
    };

    const pids = {
      net: 0,
      gameloop: 0
    };

    const createWorker = (type: 'net'|'gameloop') => {
      workers[type] = cluster.fork({ [type.toUpperCase()]: 1 });
      pids[type] = workers[type].process.pid;

      workers[type].on('message', (msg: any) => {
        Object.keys(workers).forEach(workerType => {
          if (workerType === type) return;
          workers[workerType].send(msg);
        });
      });
    };

    createWorker('net');
    console.log('CORE', `Networking started as PID ${pids.net}.`);

    createWorker('gameloop');
    console.log('CORE', `Gameloop started as PID ${pids.gameloop}.`);

    cluster.on('exit', (deadWorker) => {
      switch (deadWorker.process.pid) {
        case pids.net: {
          createWorker('net');
          console.log('CORE', `Respawning networking as PID ${pids.net}`);
          break;
        }

        case pids.gameloop: {
          createWorker('gameloop');
          console.log('CORE', `Respawning gameloop as PID ${pids.gameloop}`);
          break;
        }
      }
    });
  }

} else {

  if (process.env.NET) netStart();
  if (process.env.GAMELOOP) gameStart();

}

*/
