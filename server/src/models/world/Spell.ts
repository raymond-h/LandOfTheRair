
import { sum } from 'lodash';

import { BaseClass, ICharacter, IItemEffect, ISpellData, ItemSlot, MessageInfo, MessageType, Skill, Stat } from '../../interfaces';

import { Game } from '../../helpers';
import { BaseSpell } from '../../interfaces/BaseSpell';

export class Spell implements BaseSpell {

  constructor(protected game: Game) {}

  public sendMessage(character: ICharacter|string, message: MessageInfo, messageTypes: MessageType[] = [MessageType.Miscellaneous]): void {
    this.game.messageHelper.sendLogMessageToPlayer(character, message, messageTypes);
  }

  public formatMessage(message: string, args: { target?: string, caster?: string }): string {
    return message
      .split('%target').join(args.target ?? 'somebody')
      .split('%caster').join(args.caster ?? 'somebody');
  }

  public cast(caster: ICharacter | null, target: ICharacter | null, override: Partial<IItemEffect>): void {}

  public getDuration(caster: ICharacter | null, target: ICharacter | null, spellData: ISpellData): number {
    return 0;
  }

  public getPotency(caster: ICharacter | null, target: ICharacter | null, spellData: ISpellData): number {

    if (!caster || !target) return 1;
    // TODO: daze

    const skills = {
      [BaseClass.Healer]: Skill.Restoration,
      [BaseClass.Mage]: Skill.Conjuration,
      [BaseClass.Thief]: Skill.Thievery
    };

    const stats: Record<BaseClass, Stat> = {
      [BaseClass.Healer]: Stat.WIS,
      [BaseClass.Mage]: Stat.INT,
      [BaseClass.Thief]: Stat.INT,
      [BaseClass.Warrior]: Stat.STR,
      [BaseClass.Traveller]: Stat.LUK
    };

    let skillsToAverage = [skills[caster.baseClass]];
    if (!skills[caster.baseClass]) {

      if (caster.items.equipment[ItemSlot.RightHand]) {
        const { type, secondaryType } = this.game.itemHelper.getItemProperties(caster.items.equipment[ItemSlot.RightHand], ['type', 'secondaryType']);
        skillsToAverage = [type, secondaryType];
      } else {
        skillsToAverage = [Skill.Martial];
      }

    }

    skillsToAverage = skillsToAverage.filter(Boolean);

    const baseSkillValue = Math.floor(sum(
      skillsToAverage.map(skill => this.game.calculatorHelper.calcSkillLevelForCharacter(caster, skill) + 1)
    ) / skillsToAverage.length);

    const statMult = caster ? this.game.characterHelper.getStat(caster, stats[caster.baseClass]) : 1;

    let retPotency = this.game.diceRollerHelper.diceRoll(baseSkillValue, statMult);
    let maxMult = 1;
    (spellData.skillMultiplierChanges || []).forEach(([baseSkill, mult]) => {
      if (baseSkillValue < baseSkill) return;
      maxMult = mult;
    });

    retPotency *= maxMult;
    retPotency *= (spellData.potencyMultiplier || 1);

    // TODO: encumber

    return Math.max(1, Math.floor(retPotency));
  }

}
