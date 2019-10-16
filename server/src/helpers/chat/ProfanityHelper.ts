
import { CensorSensor } from 'censor-sensor';
import { Singleton } from 'typescript-ioc';

@Singleton
export class ProfanityHelper {

  private censorSensor: CensorSensor;

  public async init() {
    this.censorSensor = new CensorSensor();
    this.censorSensor.disableTier(2);
    this.censorSensor.disableTier(3);
    this.censorSensor.disableTier(4);
  }

  public hasProfanity(check: string): boolean {
    return this.censorSensor.isProfane(check);
  }

  public cleanMessage(msg: string): string {
    return this.censorSensor.cleanProfanity(msg);
  }

}