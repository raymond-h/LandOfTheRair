import { IMacroCommandArgs, IPlayer } from '../../../../interfaces';
import { MacroCommand } from '../../../../models/macro';

export class Chase extends MacroCommand {

  aliases = ['chase'];
  canBeInstant = false;
  canBeFast = true;

  execute(player: IPlayer, args: IMacroCommandArgs) {
    const target = this.game.targettingHelper.getFirstPossibleTargetInViewRange(player, args.stringArgs);

    if (!target) {
      this.sendMessage(player, 'You don\'t see that target!');
      return;
    }

    this.game.movementHelper.moveTowards(player, target);
  }
}
