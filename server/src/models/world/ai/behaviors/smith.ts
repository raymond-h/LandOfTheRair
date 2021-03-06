import { Parser } from 'muud';

import { Game } from '../../../../helpers';
import { GameServerResponse, IAIBehavior, IDialogChatAction, INPC, IPlayer, ISmithBehavior, ItemSlot } from '../../../../interfaces';

export class SmithBehavior implements IAIBehavior {

  init(game: Game, npc: INPC, parser: Parser, behavior: ISmithBehavior) {

    let { costPerThousand, repairsUpToCondition } = behavior;
    costPerThousand ??= 10;
    repairsUpToCondition ??= 20000;

    parser.addCommand('hello')
      .setSyntax(['hello'])
      .setLogic(async ({ env }) => {
        const player: IPlayer = env?.player;
        if (!player) return 'You do not exist.';

        if (game.directionHelper.distFrom(player, npc) > 2) return 'Please come closer.';

        const text = `Hello, ${player.name}! I am a Smith. I can repair your weapons and armor - just hold them in your right hand and say REPAIR!
        Or, you can tell me REPAIRALL and I'll repair everything you're wearing and holding.
        `;

        const formattedChat: IDialogChatAction = {
          message: text,
          displayTitle: npc.name,
          displayNPCName: npc.name,
          displayNPCSprite: npc.sprite,
          displayNPCUUID: npc.uuid,
          options: [
            { text: 'Repair Right Hand', action: 'repair' },
            { text: 'Repair All', action: 'repairall' },
            { text: 'Leave', action: 'noop' },
          ]
        };

        game.transmissionHelper.sendResponseToAccount(player.username, GameServerResponse.DialogChat, formattedChat);

        return text;
      });

    parser.addCommand('repair')
      .setSyntax(['repair'])
      .setLogic(async ({ env }) => {
        const player: IPlayer = env?.player;
        if (!player) return 'You do not exist.';

        if (game.directionHelper.distFrom(player, npc) > 2) return 'Please come closer.';

        const rightHand = player.items.equipment[ItemSlot.RightHand];
        if (!rightHand) return 'You need to hold something in your right hand!';

        const maxCondition = game.subscriptionHelper.maxSmithRepair(player, repairsUpToCondition);
        const missingCondition = maxCondition - (rightHand.mods.condition ?? 20000);
        if (missingCondition <= 0) return 'That item is as good as it\'s gonna get \'round here!';

        const cpt = costPerThousand ?? 100;

        const cost = Math.floor(cpt * (missingCondition / 1000));
        if (cost < 0) return 'That item is not in need of repair!';

        if (!game.currencyHelper.hasCurrency(player, cost)) return `You need ${cost.toLocaleString()} gold to repair that item!`;

        game.currencyHelper.loseCurrency(player, cost);
        rightHand.mods.condition = maxCondition;

        return 'Done!';
      });

    parser.addCommand('repairall')
      .setSyntax(['repairall'])
      .setLogic(async ({ env }) => {
        const player: IPlayer = env?.player;
        if (!player) return 'You do not exist.';

        if (game.directionHelper.distFrom(player, npc) > 2) return 'Please come closer.';

        const maxCondition = game.subscriptionHelper.maxSmithRepair(player, repairsUpToCondition);
        const cpt = costPerThousand ?? 100;

        let totalSpend = 0;

        Object.values(player.items.equipment).forEach(item => {
          if (!item) return;

          const missingCondition = maxCondition - (item.mods.condition ?? 20000);
          if (missingCondition <= 0) return;

          const cost = Math.floor(cpt * (missingCondition / 1000));
          if (cost < 0) return;

          totalSpend += cost;

          if (!game.currencyHelper.hasCurrency(player, cost)) return;

          game.currencyHelper.loseCurrency(player, cost);
          item.mods.condition = maxCondition;
        });

        if (totalSpend === 0) return 'You aren\'t wearing anythin\' I can fix.';

        return 'Did what I could.';
      });
  }

  tick() {}
}
