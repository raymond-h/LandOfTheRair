import { IVendorItem } from './behaviors';
import { Currency } from './building-blocks';
import { INPC } from './npc';
import { IPlayer } from './player';

export interface IGame {
  inGame: boolean;
  currentTarget: string;
  itemTooltip: string;
  player: IPlayer;
  map: any;

  trainerInfo: {
    npcUUID: string;
    npcName: string;
    npcSprite: number;
    npcMaxLevel: number;
    npcMaxSkill: number;
  };

  vendorInfo: {
    npcUUID: string;
    npcName: string;
    npcSprite: number;
    npcVendorCurrency: Currency;
    npcVendorItems: IVendorItem[];
    npcVendorDailyItems: IVendorItem[];
  };

  bankInfo: {
    npcUUID: string;
    npcName: string;
    npcSprite: number;
    npcBank: string;
    npcBranch: string;
  };

  mapInfo: {
    players: Record<string, Partial<IPlayer>>;
    npcs: Record<string, Partial<INPC>>;
    ground: any;
    openDoors: Record<number, boolean>;
  };
}
