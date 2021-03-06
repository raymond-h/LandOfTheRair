
import { Injectable } from 'injection-js';
import { set } from 'lodash';

import { GameAction, GameServerResponse, ICharacter, MessageInfo, MessageType, SoundEffect } from '../../interfaces';
import { Player } from '../../models';
import { BaseService } from '../../models/BaseService';

@Injectable()
export class MessageHelper extends BaseService {

  public init() {}

  public sendLogMessageToPlayer(
    charOrUUID: ICharacter | string,
    { message, sfx, from, setTarget, logInfo }: MessageInfo,
    messageTypes: MessageType[] = [MessageType.Miscellaneous],
    formatArgs: ICharacter[] = []
  ): void {

    let uuid = (charOrUUID as ICharacter).uuid;
    if (!uuid) uuid = charOrUUID as string;

    const ref: ICharacter = this.game.worldManager.getCharacter(uuid);
    if (!ref) return;

    const account = this.game.lobbyManager.getAccount((ref as Player).username);
    if (!account) return;

    if (from) message = `**${from}**: ${message}`;

    let sendMessage = message;
    if (formatArgs.length > 0) sendMessage = this.formatMessage(ref, sendMessage, formatArgs);

    if (sfx) this.playSoundForPlayer((ref as Player), sfx);

    this.game.transmissionHelper.sendResponseToAccount((ref as Player).username, GameServerResponse.GameLog, {
      type: GameServerResponse.GameLog,
      messageTypes,
      message: sendMessage,
      sfx,
      setTarget,
      logInfo
    });
  }

  public sendLogMessageToRadius(
    character: ICharacter,
    radius: number,
    { message, sfx, from, setTarget, except }: MessageInfo,
    messageTypes: MessageType[] = [MessageType.Miscellaneous],
    formatArgs: ICharacter[] = []
  ): void {

    if (from) message = `**${from}**: ${message}`;

    const { state } = this.game.worldManager.getMap(character.map);
    if (!state) return;

    const allPlayers = state.getAllPlayersInRange(character, radius);

    allPlayers.forEach(checkPlayer => {
      const account = this.game.lobbyManager.getAccount((checkPlayer as Player).username);
      if (!account) return;

      if (except && except.includes(checkPlayer.uuid)) return;

      let sendMessage = message;
      if (formatArgs.length > 0) sendMessage = this.formatMessage(checkPlayer, sendMessage, formatArgs);

      if (sfx) this.playSoundForPlayer((checkPlayer as Player), sfx);

      this.game.transmissionHelper.sendResponseToAccount((checkPlayer as Player).username, GameServerResponse.GameLog, {
        type: GameServerResponse.GameLog,
        messageTypes,
        message: sendMessage,
        sfx,
        setTarget
      });
    });
  }

  public sendSimpleMessage(character: ICharacter, message: string, sfx?: SoundEffect): void {
    this.sendLogMessageToPlayer(character, { message, sfx });
  }

  public sendPrivateMessage(from: ICharacter, to: ICharacter, message: string): void {
    this.sendLogMessageToPlayer(to, { message: `from **${from.name}**: ${message}` }, [MessageType.Private, MessageType.PlayerChat]);
    this.sendLogMessageToPlayer(from, { message: `to **${to.name}**: ${message}` }, [MessageType.Private, MessageType.PlayerChat]);
  }

  public broadcastSystemMessage(message: string): void {
    this.sendMessage('★System', message);
  }

  public broadcastChatMessage(player: ICharacter, message: string): void {

    const account = this.game.lobbyManager.getAccount((player as Player).username);
    if (!account) return;

    const username = (player as Player).username;

    this.sendMessage(username, message);
  }

  private sendMessage(from: string, message: string): void {
    message = message.trim();
    if (!message) return;

    this.game.wsCmdHandler.broadcast({
      action: GameAction.ChatAddMessage,
      timestamp: Date.now(),
      message,
      from
    });

    this.game.wsCmdHandler.broadcast({
      type: GameServerResponse.Chat,
      timestamp: Date.now(),
      message,
      from
    });
  }

  public formatMessage(target: ICharacter, message: string, formatArgs: any[]): string {
    if (!formatArgs.length) return message;

    return [...formatArgs].reduce((str, c: ICharacter, idx) => {
      if (!c) return str;

      let name = c.name;

      if (!this.game.visibilityHelper.canSee(target, c.x - target.x, c.y - target.y)
      || !this.game.visibilityHelper.canSeeThroughStealthOf(target, c)) name = 'somebody';
      if (target === c) name = 'yourself';
      return str.replace(new RegExp(`%${idx}`), name);

    }, message);
  }

  public playSoundForPlayer(player: Player, sfx: string): void {
    this.game.transmissionHelper.sendResponseToPlayer(player, GameServerResponse.PlaySFX, { sfx });
  }

  public getMergeObjectFromArgs(args: string): any {
    const matches = args.match(/(?:[^\s"']+|['"][^'"]*["'])+/g) || [];

    const mergeObj = matches.reduce((obj, prop) => {
      const propData = prop.split('=');
      const key = propData[0];
      let val: string|number = propData[1];

      if (!val) return obj;

      val = val.trim();

      if (!isNaN(+val)) {
        val = +val;
      } else if (val.startsWith('"')) {
        val = val.substring(1, val.length - 1);
      }

      set(obj, key.trim(), val);
      return obj;
    }, {});

    return mergeObj;
  }

}
