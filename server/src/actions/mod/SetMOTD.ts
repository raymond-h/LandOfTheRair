import { Game } from '../../helpers';
import { GameAction, GameServerEvent } from '../../interfaces';
import { ServerAction } from '../../models/ServerAction';

export class SetMOTDAction extends ServerAction {
  type = GameServerEvent.SetMOTD;
  requiredKeys = ['motd'];

  async act(game: Game, { broadcast }, data) {

    const account = game.lobbyManager.getAccount(data.username);
    if (!account || !account.isGameMaster) return { message: 'Not a GM.' };

    try {

      game.worldDB.setMOTD(data.motd || '');

      broadcast({
        action: GameAction.ChatSetMOTD,
        motd: data.motd
      });

    } catch (e) {
      game.logger.error('SetMOTDAction', e);
      return { message: 'Could not set MOTD? I would normally say to contact a GM, but this is probably your fault.' };
    }

    return {};
  }
}
