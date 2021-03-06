import { BaseClass, ICharacter, IStatusEffect, Stat } from '../../../../interfaces';
import { Effect } from '../../../../models';

export class MinorMP extends Effect {

  apply(char: ICharacter, effect: IStatusEffect) {

    if (char.baseClass === BaseClass.Thief || char.baseClass === BaseClass.Warrior) {
      return this.sendMessage(char, { message: 'Yuck! That tasted like thinking.' });
    }

    if (this.game.characterHelper.getBaseStat(char, Stat.MP) >= 300) {
      return this.sendMessage(char, { message: 'The fluid was tasteless.' });
    }

    this.game.characterHelper.gainPermanentStat(char, Stat.MP, effect.effectInfo.potency);
    this.sendMessage(char, { message: 'Your mental capacity has increased!' });
  }

}
