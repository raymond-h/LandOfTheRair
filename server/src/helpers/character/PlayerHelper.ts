import { Injectable } from 'injection-js';
import { isArray, random, size } from 'lodash';
import uuid from 'uuid/v4';

import { Allegiance, BaseClass, BGM, Direction,
  initializePlayer, IPlayer, ISuccorInfo, MessageType, Skill, Stat } from '../../interfaces';
import { Account, Player } from '../../models';
import { BaseService } from '../../models/BaseService';
import { SubscriptionHelper } from '../account';
import { GetSwimLevel, StaticTextHelper, WorldManager } from '../data';
import { CharacterHelper } from './CharacterHelper';
import { TeleportHelper } from './TeleportHelper';
import { VisibilityHelper } from './VisibilityHelper';


@Injectable()
export class PlayerHelper extends BaseService {

  constructor(
    private characterHelper: CharacterHelper,
    private staticTextHelper: StaticTextHelper,
    private visibilityHelper: VisibilityHelper,
    private subscriptionHelper: SubscriptionHelper,
    private teleportHelper: TeleportHelper,
    private worldManager: WorldManager
  ) {
    super();
  }

  public init() {}

  public migrate(player: Player, playerAccount: Account): void {
    const basePlayer = initializePlayer({});
    Object.keys(basePlayer).forEach(key => {
      if (player[key]) return;
      player[key] = basePlayer[key];
    });

    if (!player.uuid) player.uuid = uuid();
    if (!player.dir) player.dir = Direction.South;
    if (!player.actionQueue) player.actionQueue = { fast: [], slow: [] };
    if (!player.effects.debuff) player.effects.debuff = [];
    if (!player.effects.buff) player.effects.buff = [];
    if (!player.effects.outgoing) player.effects.outgoing = [];
    if (!player.effects.incoming) player.effects.incoming = [];
    if (!player.stats.mp) player.stats.mp = 100;
    if (!player.stats.mpregen) player.stats.mpregen = 1;
    if ((player.mp as any).__current) {
      player.mp.current = (player.mp as any).__current;
      delete (player.mp as any).__current;
    }
    if ((player.hp as any).__current) {
      player.hp.current = (player.hp as any).__current;
      delete (player.hp as any).__current;
    }

    if (!player.traits.tp && size(player.traits.traitsLearned) === 0) {
      this.game.traitHelper.resetTraits(player);
    }

    player.agro = {};

    player.isGM = playerAccount.isGameMaster;
    player.isTester = playerAccount.isTester;
    player.username = playerAccount.username;
    player.isSubscribed = this.subscriptionHelper.isSubscribed(playerAccount);

    player.lastRegionDesc = '';
    player.lastTileDesc = '';

    this.reformatPlayerAfterLoad(player);

    this.game.questHelper.recalculateQuestKillsAndStatRewards(player);
  }

  public becomeClass(player: IPlayer, baseClass: BaseClass, recalculateAfterTrait = true) {
    const maxMP: Record<BaseClass, number> = {
      [BaseClass.Healer]: 20,
      [BaseClass.Mage]: 30,
      [BaseClass.Warrior]: 100,
      [BaseClass.Thief]: 100,
      [BaseClass.Traveller]: 0
    };

    player.baseClass = baseClass;
    player.mp.maximum = maxMP[baseClass];
    player.stats.mp = 0;

    const learnTrait: Record<BaseClass, string> = {
      [BaseClass.Healer]: 'Afflict',
      [BaseClass.Mage]: 'MagicMissile',
      [BaseClass.Warrior]: 'Cleave',
      [BaseClass.Thief]: 'ImprovedHide',
      [BaseClass.Traveller]: ''
    };

    if (learnTrait[player.baseClass]) {
      this.game.traitHelper.learnTrait(player, learnTrait[player.baseClass], recalculateAfterTrait);
    }
  }

  public reformatPlayerBeforeSave(player: Player): void {

    // persist remaining ticks so on load we don't lose effect times
    Object.values(player.effects || {}).forEach(arr => {
      if (!isArray(arr)) return;

      arr.forEach(eff => {
        if (eff.endsAt === -1) return;
        eff._ticksLeft = Math.floor((eff.endsAt - Date.now()) / 1000);
      });
    });
  }

  public reformatPlayerAfterLoad(player: Player): void {

    // re-hydrate effect timers
    Object.values(player.effects || {}).forEach(arr => {
      if (!isArray(arr)) return;

      arr.forEach(eff => {
        if (!eff._ticksLeft) return;
        eff.endsAt = Date.now() + (eff._ticksLeft * 1000);
        delete eff._ticksLeft;
      });
    });
  }

  public tick(player: Player, type: 'fast'|'slow', tick: number): void {
    if (type === 'slow') {
      this.characterHelper.tick(player, tick);
      this.game.transmissionHelper.generateAndQueuePlayerPatches(player);
    }

    // do actions if we have any
    if (player.actionQueue) {
      const queue = player.actionQueue[type] || [];

      const actions = type === 'fast' ? 1 : (this.getStat(player as IPlayer, Stat.ActionSpeed) || 1);

      for (let i = 0; i < actions; i++) {
        const command = queue.shift();

        // if there isn't a command we can't do anything
        if (!command) continue;

        // check if we can actually cast this
        const args = (command as any).args;

        //  if we have a spell, we gotta do a lot of checks
        if (args.spell) {
          const [prefix, spell] = args.spell.split(' ');
          let hasLearned = this.game.characterHelper.hasLearned(player, spell || prefix);
          if (!hasLearned && (prefix === 'stance' || prefix === 'powerword')) {
            hasLearned = this.game.characterHelper.hasLearned(player, `${prefix}${spell}`);
          }

          // if we have to bail because we dont know the spell, we let them know
          if (!hasLearned) {
            this.game.messageHelper.sendSimpleMessage(player, 'You do not know that ability!');
            continue;

          // otherwise, we know it, but we'll try to abuse an item for it
          } else {
            if (this.game.characterHelper.hasLearnedFromItem(player, spell)) {
              args.overrideEffect = this.game.characterHelper.abuseItemsForLearnedSkillAndGetEffect(player, spell);
            }
          }
        }

        // finally, we do the command
        command();
      }
    }

    // if we're on a dense tile, "respawn"
    const { map } = this.worldManager.getMap(player.map);
    if (map.getWallAt(player.x, player.y) || map.getDenseDecorAt(player.x, player.y)) {
      this.teleportHelper.teleportToRespawnPoint(player);
    }
  }

  public clearActionQueue(player: Player, target?: string) {

    // if we specify a target, we remove them from the queue as convenience
    if (target) {
      player.actionQueue.fast = player.actionQueue.fast.filter(x => !(x as any).args.stringArgs.includes(target));
      player.actionQueue.slow = player.actionQueue.slow.filter(x => !(x as any).args.stringArgs.includes(target));
      return;
    }

    // otherwise, just reset the entire queue
    player.actionQueue = { fast: [], slow: [] };
  }

  // reset swim level, fov, region desc
  public resetStatus(player: Player, opts: { ignoreMessages?: boolean, sendFOV?: boolean } = { sendFOV: true }) {

    this.visibilityHelper.calculatePlayerFOV(player, opts.sendFOV);

    const { map } = this.worldManager.getMap(player.map);

    const swimTile = map.getFluidAt(player.x, player.y);
    const swimInfo = GetSwimLevel(swimTile);

    if (swimInfo) {
      const { element, swimLevel } = swimInfo;
      player.swimElement = element;
      player.swimLevel = swimLevel;

      if (!this.game.effectHelper.hasEffect(player, 'Swimming')
      && !this.game.effectHelper.hasEffect(player, 'Drowning')) {
        const swimDuration = this.game.characterHelper.getStat(player, Stat.STR);
        this.game.effectHelper.addEffect(player, '', 'Swimming', { effect: { duration: swimDuration } });
      }

    } else {
      player.swimElement = '';
      player.swimLevel = 0;

      this.game.effectHelper.removeEffectByName(player, 'Swimming');
      this.game.effectHelper.removeEffectByName(player, 'Drowning');
    }

    // update the players BGM
    const newBGM = map.getBackgroundMusicAt(player.x, player.y);
    const oldBGM = player.bgmSetting;

    if (oldBGM !== newBGM) {
      player.bgmSetting = (newBGM || 'wilderness') as BGM;
    }

    // send message updates while the player is walking around the world
    if (!opts.ignoreMessages) {

      const regionDesc = map.getRegionDescriptionAt(player.x, player.y);

      let desc = '';

      const descObj = map.getInteractableAt(player.x, player.y) || map.getDecorAt(player.x, player.y);
      desc = this.staticTextHelper.getGidDescription(descObj?.gid);

      // we do this to avoid unnecessary lookups
      if (!desc) {
        desc = this.staticTextHelper.getGidDescription(map.getFluidAt(player.x, player.y));
      }

      if (!desc) {
        desc = map.getFoliageAt(player.x, player.y) ? 'You are near some trees.' : '';
      }

      if (!desc) {
        desc = this.staticTextHelper.getGidDescription(map.getFloorAt(player.x, player.y));
      }

      if (!desc) {
        desc = this.staticTextHelper.getGidDescription(map.getTerrainAt(player.x, player.y));
      }

      // send a new region desc if possible
      const hasNewRegion = regionDesc && regionDesc !== player.lastRegionDesc;
      if (hasNewRegion) {
        player.lastRegionDesc = regionDesc;
        this.game.messageHelper.sendLogMessageToPlayer(player, { message: regionDesc }, [MessageType.Environment]);

      } else if (!regionDesc) {
        player.lastRegionDesc = '';
      }

      // send a new tile desc if possible
      if (!hasNewRegion && desc && desc !== player.lastTileDesc) {
        player.lastTileDesc = desc;
        this.game.messageHelper.sendLogMessageToPlayer(player, { message: desc }, [MessageType.Environment]);
      }
    }
  }

  // get a stat from a player, or 0
  public getStat(player: IPlayer, stat: Stat): number {
    return player.stats[stat] || 0;
  }

  // flag a certain skill for a player
  public flagSkill(player: IPlayer, skill: Skill|Skill[]): void {
    player.flaggedSkills = Array.isArray(skill) ? skill : [skill];
  }

  // whether or not the player can get skill on the current map
  public canGainSkillOnMap(player: IPlayer, skill: Skill): boolean {
    const { map } = this.worldManager.getMap(player.map);
    return player.skills[skill.toLowerCase()] < map.maxSkillExp;
  }

  // whether or not the player can get xp on the current map
  public canGainExpOnMap(player: IPlayer): boolean {
    const { map } = this.worldManager.getMap(player.map);
    return player.exp < map.maxLevelExp;
  }

  // gain exp for a player
  public gainExp(player: IPlayer, xpGained: number): void {
    if (player.gainingAXP && xpGained > 0) return;

    const xpGainBoostPercent = this.game.characterHelper.getStat(player, Stat.XPBonusPercent);
    xpGained += Math.floor((xpGainBoostPercent * xpGained) / 100);

    // TODO: modify xpGained for sub
    xpGained = this.game.userInputHelper.cleanNumber(xpGained, 0, { floor: true });

    player.exp = Math.max(Math.floor(player.exp + xpGained), 0);
    player.exp = Math.min(player.exp, this.game.configManager.MAX_EXP);

  }

  // gain axp for a player
  public gainAxp(player: IPlayer, axpGained: number): void {
    if (!player.gainingAXP && axpGained > 0) return;

    // TODO: modify axpGained for sub
    axpGained = this.game.userInputHelper.cleanNumber(axpGained, 0, { floor: true });
    player.axp = Math.max(Math.floor(player.axp + axpGained), 0);

  }

  // try to gain skill based on the current map etc
  public tryGainSkill(player: IPlayer, skill: Skill, skillGained: number): void {
    if (!this.canGainSkillOnMap(player, skill)) return;

    this.gainSkill(player, skill, skillGained);
  }

  // gain skill for a character
  public gainSkill(player: IPlayer, skill: Skill, skillGained: number): void {
    if (!skill) skill = Skill.Martial;

    const xpGainBoostPercent = this.game.characterHelper.getStat(player, Stat.SkillBonusPercent);
    skillGained += Math.floor((xpGainBoostPercent * skillGained) / 100);

    // TODO: modify skillGained for sub
    skillGained = this.game.userInputHelper.cleanNumber(skillGained, 0, { floor: true });

    player.skills[skill.toLowerCase()] = Math.max((player.skills[skill.toLowerCase()] ?? 0) + skillGained, 0);
    player.skills[skill.toLowerCase()] = Math.min(player.skills[skill.toLowerCase()], this.game.configManager.MAX_SKILL_EXP);
  }

  // gain all currently flagged skills
  public gainCurrentSkills(player: IPlayer, skillGained: number): void {
    if (!player.flaggedSkills || !player.flaggedSkills.length) return;

    const [primary, secondary, tertiary, quaternary] = player.flaggedSkills;

    if (quaternary) {
      this.gainSkill(player, primary, skillGained * 0.45);
      this.gainSkill(player, secondary, skillGained * 0.25);
      this.gainSkill(player, tertiary, skillGained * 0.15);
      this.gainSkill(player, quaternary, skillGained * 0.15);

    } else if (tertiary) {
      this.gainSkill(player, primary, skillGained * 0.55);
      this.gainSkill(player, secondary, skillGained * 0.25);
      this.gainSkill(player, tertiary, skillGained * 0.20);

    } else if (secondary) {
      this.gainSkill(player, primary, skillGained * 0.75);
      this.gainSkill(player, secondary, skillGained * 0.25);

    } else {
      this.gainSkill(player, primary, skillGained);
    }
  }

  // modify rep for a faction
  public modifyReputationForAllegiance(player: IPlayer, allegiance: Allegiance, mod: number): void {
    player.allegianceReputation[allegiance] = player.allegianceReputation[allegiance] ?? 0;
    player.allegianceReputation[allegiance]! += mod;
  }

  // gain stats for leveling up
  public gainLevelStats(player: IPlayer): void {

    const con = this.game.characterHelper.getStat(player, Stat.CON);
    const wis = this.game.characterHelper.getStat(player, Stat.WIS);
    const int = this.game.characterHelper.getStat(player, Stat.INT);

    const classStats: Record<BaseClass, () => void> = {
      [BaseClass.Traveller]: () => {
        const hpGained = Math.floor(random(2, con / 2) + con / 2);
        this.game.characterHelper.gainPermanentStat(player, Stat.HP, hpGained);
      },

      [BaseClass.Warrior]: () => {
        const hpGained = Math.floor(random(1, con / 2) + con / 2);
        this.game.characterHelper.gainPermanentStat(player, Stat.HP, hpGained);
      },

      [BaseClass.Thief]: () => {
        const hpGained = Math.floor(random(2, con) + con / 2);
        this.game.characterHelper.gainPermanentStat(player, Stat.HP, hpGained);
      },

      [BaseClass.Healer]: () => {
        const hpGained = Math.floor(random(con / 5, (3 * con / 5)) + con / 3);
        this.game.characterHelper.gainPermanentStat(player, Stat.HP, hpGained);

        const mpGained = Math.floor(random(1, wis) + wis / 3);
        this.game.characterHelper.gainPermanentStat(player, Stat.MP, mpGained);
      },

      [BaseClass.Mage]: () => {
        const hpGained = Math.floor(random(1, con));
        this.game.characterHelper.gainPermanentStat(player, Stat.HP, hpGained);

        const mpGained = Math.floor(random(2, int * 2) + int / 5);
        this.game.characterHelper.gainPermanentStat(player, Stat.MP, mpGained);
      }
    };

    classStats[player.baseClass]();

    this.game.characterHelper.recalculateEverything(player);
  }

  // try to level up a player to the maximum possible level they can go based on the trainer they see
  public tryLevelUp(player: IPlayer, maxLevel = 0): void {
    do {
      if (player.level >= maxLevel) break;

      const neededXp = this.game.calculatorHelper.calculateXPRequiredForLevel(player.level + 1);
      if (player.exp >= neededXp) {
        player.level += 1;
        if (player.level > player.highestLevel) {
          player.highestLevel = player.level;
          player.traits.tp += 2;
          this.gainLevelStats(player);
        }
        break;
      } else {
        break;
      }
    } while (player.level < maxLevel);
  }

  // teleport the player to the succor location
  public doSuccor(player: IPlayer, succorInfo: ISuccorInfo) {
    if (this.game.characterHelper.isDead(player)) return;

    const { map } = this.game.worldManager.getMap(player.map);
    if (!map.canSuccor(player)) {
      this.game.messageHelper.sendSimpleMessage(player, 'The blob turns to ash in your hand!');
      return;
    }

    if (!succorInfo.map || !succorInfo.x || !succorInfo.y) {
      this.game.messageHelper.sendSimpleMessage(player, 'Your succor is not valid.');
      this.game.logger.log('PlayerHelper:DoSuccor', `Bad Succor: ${JSON.stringify(succorInfo)}`);
      return;
    }

    this.game.messageHelper.sendSimpleMessage(player, 'You are whisked back to the place in your stored memories!');
    this.game.teleportHelper.teleport(player as Player, succorInfo);
    this.game.transmissionHelper.sendMovementPatch(player as Player);
  }

}
