import { Injectable } from 'injection-js';

import { BaseService, GameAction, IPlayer } from '../../interfaces';
import { Account, Player, PlayerState } from '../../models';
import { CharacterHelper } from '../character';


@Injectable()
export class PlayerManager extends BaseService {

  private currentSlowTick = 0;
  private readonly SAVE_TICK_COUNT = 150;

  constructor(
    private characterHelper: CharacterHelper
  ) {
    super();
  }

  private inGamePlayers: { [account: string]: Player } = {};
  private playerStates: { [account: string]: PlayerState } = {};

  public init() {}

  // get all players. pretty sparingly used.
  public getAllPlayers(): Player[] {
    return Object.values(this.inGamePlayers);
  }

  // get a player in game based on the account username
  public getPlayerInGame(account: Account): Player {
    return this.getPlayerByUsername(account.username);
  }

  // get a player in game based on the account username
  public getPlayerByUsername(username: string): Player {
    return this.inGamePlayers[username];
  }

  // get a player state based on the player
  public getPlayerState(player: IPlayer): PlayerState {
    return this.playerStates[player.username];
  }

  // add a player to the game
  public async addPlayerToGame(player: Player) {

    const username = player.username;
    this.inGamePlayers[username] = player;

    const state = new PlayerState();
    this.playerStates[username] = state;
    this.game.transmissionHelper.startWatching(player, state);

    this.game.playerHelper.resetStatus(player);
    this.updatePlayerData(player);
  }

  // remove a player from the game
  public async removePlayerFromGame(player: Player) {
    const username = player.username;
    delete this.inGamePlayers[username];
    delete this.playerStates[username];
    this.game.transmissionHelper.stopWatching(player);

    this.game.transmissionHelper.sendActionToAccount(username, GameAction.GameSetPlayer, { player: null });
  }

  // remove a player from the game by their account ref
  public async removePlayerFromGameByAccount(account: Account) {
    delete this.inGamePlayers[account.username];

    this.game.transmissionHelper.sendActionToAccount(account.username, GameAction.GameSetPlayer, { player: null });
  }

  // recalculate stats and do other sync related data
  public updatePlayerData(player: Player) {
    this.characterHelper.recalculateEverything(player);
  }

  private tick(timer, type: 'slow'|'fast', tick: number) {
    Object.values(this.inGamePlayers).forEach(player => {

      this.game.playerHelper.tick(player, type, tick);

      // effects tick at most once per second
      if (type === 'slow') {
        timer.startTimer(`slow-- ${player.name}`);
        this.game.effectHelper.tickEffects(player);
        timer.stopTimer(`slow-- ${player.name}`);
      }

      // not sure if this will be a good idea or not, we'll see
      if (type === 'fast') {
        timer.startTimer(`fast-- ${player.name}`);
        this.game.transmissionHelper.tryAutoPatchPlayer(player);
        timer.stopTimer(`fast-- ${player.name}`);
      }
    });
  }

  // save a single player
  public savePlayer(player: Player) {
    this.game.characterDB.savePlayer(player);
  }

  // save all players
  public saveAllPlayers() {
    const players = Object.values(this.inGamePlayers);
    if (players.length === 0) return;

    this.game.characterDB.saveAllPlayers(players);
  }

  // do a fast tick (200ms by default)
  public fastTick(timer, tick: number) {
    this.tick(timer, 'fast', tick);
  }

  // do a slow tick (1000ms by default)
  public slowTick(timer, tick: number) {
    this.tick(timer, 'slow', tick);

    this.currentSlowTick++;
    if ((this.currentSlowTick % this.SAVE_TICK_COUNT) === 0) {
      this.saveAllPlayers();
    }
  }

}
