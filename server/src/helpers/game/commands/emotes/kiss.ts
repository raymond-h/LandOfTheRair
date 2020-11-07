import { IMacroCommandArgs, IPlayer } from '../../../../interfaces';
import { MacroCommand } from '../../../../models/macro';

export class Kiss extends MacroCommand {

  aliases = ['kiss'];
  canBeInstant = true;
  canBeFast = true;

  execute(player: IPlayer, args: IMacroCommandArgs) {
    const state = this.game.worldManager.getMapStateForCharacter(player);
    const playersInView = state.getAllPlayersInRange(player, 4);
    const target = this.game.targettingHelper.getFirstPossibleTargetInViewRange(player, args.stringArgs);

    if (!target || args.arrayArgs.length === 0 || target === player) {
      this.sendMessage(player, 'You blow a kiss!');
      playersInView.filter(element => element !== player).forEach(p => {
        this.sendChatMessage(p, `${player.name} blows a kiss!`);
      });
      return;
    }

    this.sendMessage(player, `You kiss ${target.name}!`);
    this.sendMessage(target, `${player.name} kisses you!`);
    playersInView.filter(element => element !== player && element !== target).forEach(p => {
      this.sendChatMessage(p, `${player.name} kisses ${target.name}!`);
    });

  }

}
