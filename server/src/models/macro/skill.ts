import { ICharacter, IMacroSkill } from '../../interfaces';
import { MacroCommand } from './command';

// TODO: https://github.com/LandOfTheRair/landoftherair/blob/master/src/server/base/Skill.ts
export class MacroSkill extends MacroCommand implements IMacroSkill {

  aliases = [];

  targetsFriendly = false;
  requiresLearn = false;

  range(char: ICharacter) { return 0; }
  cost(char: ICharacter) { return 0; }
  modifyCost(char: ICharacter, cost: number) { return cost; }
  canUse(char: ICharacter, target: ICharacter) { return true; }

  use(char: ICharacter, target: ICharacter, opts?: any) {}

}
