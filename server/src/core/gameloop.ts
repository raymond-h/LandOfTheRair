
import { Inject } from 'typescript-ioc';

import { WebsocketCommandHandler } from '../helpers';
import { GameServerResponse } from '../interfaces';

export class GameloopWorker {

  @Inject private wsCommands!: WebsocketCommandHandler;

  async start() {
    process.on('message', msg => this.handleMessage(msg));

    process.on('unhandledRejection', (error) => {
      console.error('GAME', `Unhandled Rejection`, error);
    });

    process.on('uncaughtException', (error) => {
      console.error('GAME', `Uncaught Exception`, error);
    });

    await this.wsCommands.init();
    process.send!({ __ready: true });
  }

  private async handleMessage(msg) {
    const { socketId, type, ...args } = msg;

    try {
      await this.wsCommands.doAction(type, args, socketId, (id, data) => this.emit(id, data));
    } catch (e) {
      this.emit(socketId, { type: GameServerResponse.Error, error: e.message });
    }
  }

  private emit(socketId, data) {
    process.send!({ socketId, ...data });
  }

}
