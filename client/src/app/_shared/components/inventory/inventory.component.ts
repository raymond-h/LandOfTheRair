import { Component, Input, OnInit } from '@angular/core';
import { Select } from '@ngxs/store';
import { Observable } from 'rxjs';
import { IPlayer } from '../../../../interfaces';
import { GameState } from '../../../../stores';
import { UIService } from '../../../services/ui.service';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {

  @Select(GameState.player) player$: Observable<IPlayer>;

  @Input() public size: number;
  @Input() public displaySize = 'lg';
  @Input() public context: 'Sack' | 'Belt' | 'DemiMagicPouch';
  @Input() public container: 'sack' | 'belt' | 'pouch';

  public get slots() {
    return Array(this.size).fill(null).map((v, i) => i);
  }

  constructor(public uiService: UIService) { }

  ngOnInit() {
  }

}
