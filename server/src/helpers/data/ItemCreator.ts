import { Inject, Singleton } from 'typescript-ioc';
import { ContentManager } from './ContentManager';

@Singleton
export class ItemCreator {

  @Inject private content: ContentManager;

  public init() {}

}