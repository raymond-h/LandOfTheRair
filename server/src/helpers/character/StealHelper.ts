
import { Injectable } from 'injection-js';
import { random, sample } from 'lodash';

import { BaseClass, ICharacter, IPlayer, Skill, Stat } from '../../interfaces';
import { BaseService } from '../../models/BaseService';

@Injectable()
export class StealHelper extends BaseService {

  public init() {}

  private sendMessage(to: ICharacter, co: ICharacter, message: string, target?: boolean): void {
    const base: any = { message };
    if (target) base.setTarget = co.uuid;
    this.game.messageHelper.sendLogMessageToPlayer(to, base);
  }

  private gainThiefSkill(gainer: ICharacter, value: number): void {
    if (!this.game.characterHelper.isPlayer(gainer)) return;
    this.game.playerHelper.tryGainSkill(gainer as IPlayer, Skill.Thievery, value);
  }

  public async trySteal(char: ICharacter, target: ICharacter): Promise<void> {

    const targetGold = this.game.currencyHelper.getCurrency(target);

    // if they have nothing to steal, we bail
    if (target.items.sack.items.length === 0 && targetGold <= 0) {
      this.game.characterHelper.addAgro(char, target, 1);
      this.sendMessage(char, target, `You can't seem to find anything to take!`, true);
      return;
    }

    const myStealth = this.game.characterHelper.getStat(char, Stat.Stealth);
    const yourPerception = this.game.characterHelper.getStat(target, Stat.Perception);

    const mySkill = this.game.characterHelper.getSkillLevel(char, Skill.Thievery) * (char.baseClass === BaseClass.Thief ? 1.5 : 1);
    const yourSkill = this.game.characterHelper.getSkillLevel(target, Skill.Thievery) * (target.baseClass === BaseClass.Thief ? 1.5 : 1);

    const stealRoll = random(-yourSkill, mySkill);

    const thiefName = yourPerception > myStealth ? char.name : 'somebody';

    const nimbleFingersLevelValue = this.game.traitHelper.traitLevelValue(char, 'NimbleFingers');
    const stealMod = 1 + this.game.traitHelper.traitLevelValue(char, 'ImprovedSteal') + nimbleFingersLevelValue;

    if (targetGold > 0) {
      const difficulty = 3;

      if ((stealRoll + stealMod - difficulty) < 0) {
        this.gainThiefSkill(char, 1);
        this.game.characterHelper.addAgro(char, target, 1);
        this.sendMessage(char, target, 'Your stealing attempt was thwarted!', true);
        this.sendMessage(target, char, `${thiefName} just tried to steal from you!`, true);
        return;
      }

      const fuzzedSkill = random(Math.max(mySkill - 3, 1), mySkill + 5);

      const stolenGold = Math.max(
        1,
        Math.min(
          targetGold,
          nimbleFingersLevelValue * mySkill * 100 * stealMod,
          Math.max(5, Math.floor(targetGold * (fuzzedSkill / 100)))
        )
      );

      const handName = this.game.characterHelper.getEmptyHand(char);
      if (!handName) return;

      this.game.currencyHelper.loseCurrency(target, stolenGold);
      const item = this.game.itemCreator.getGold(stolenGold);

      this.game.characterHelper.setEquipmentSlot(char, handName, item);

      this.sendMessage(char, target, `You stole ${stolenGold} gold from ${target.name}!`, true);
      return;

    } else if (target.items.sack.items.length > 0) {
      const difficulty = 10;

      if ((stealRoll + stealMod - difficulty) < 0) {
        this.gainThiefSkill(char, 1);
        this.game.characterHelper.addAgro(char, target, 1);
        this.sendMessage(char, target, 'Your stealing attempt was thwarted!', true);
        this.sendMessage(target, char, `${thiefName} just tried to steal from you!`, true);
        return;
      }

      const handName = this.game.characterHelper.getEmptyHand(char);
      if (!handName) return;

      const item = sample(target.items.sack.items);
      this.game.inventoryHelper.removeItemFromSack(target, item);

      this.game.characterHelper.setEquipmentSlot(char, handName, item);

      this.sendMessage(char, target, `You stole a ${item.itemClass.toLowerCase()} from ${target.name}!`, true);

    }

    if (char.level < target.level + 3) {
      this.gainThiefSkill(char, 3);
    }

  }

}
