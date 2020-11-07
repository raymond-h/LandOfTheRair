import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Select } from '@ngxs/store';
import { Observable } from 'rxjs';

import { GameServerResponse, IDialogChatAction } from '../../interfaces';
import { GameState } from '../../stores';

import { AboutComponent } from '../_shared/modals/about/about.component';
import { AccountComponent } from '../_shared/modals/account/account.component';
import { AlertComponent } from '../_shared/modals/alert/alert.component';
import { ConfirmModalComponent } from '../_shared/modals/confirm/confirm.component';
import { DialogComponent } from '../_shared/modals/dialog/dialog.component';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  @Select(GameState.inGame) inGame$: Observable<boolean>;
  private npcDialogRef: MatDialogRef<DialogComponent>;

  constructor(
    private socketService: SocketService,
    private snackbar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  public init() {
    this.inGame$.subscribe(val => {
      if (!val && this.npcDialogRef) {
        this.npcDialogRef.close();
      }
    });

    this.socketService.registerComponentCallback(
      this.constructor.name, GameServerResponse.Error,
      (data) => this.notifyError(data.error)
    );

    this.socketService.registerComponentCallback(
      this.constructor.name, GameServerResponse.SendNotification,
      (data) => this.notify(data.message)
    );
  }

  public notify(text: string) {
    return this.snackbar.open(text, 'Close', {
      panelClass: ['fancy', 'normal'],
      duration: 3000
    });
  }

  public notifyError(text: string) {
    return this.snackbar.open(text, 'Close', {
      panelClass: ['fancy', 'error'],
      duration: 3000
    });
  }

  public alert(title: string, content: string) {
    this.dialog.open(AlertComponent, {
      width: '450px',
      panelClass: 'fancy',
      data: { title, content }
    });
  }

  public confirm(title: string, content: string) {
    const confirm = this.dialog.open(ConfirmModalComponent, {
      width: '450px',
      panelClass: 'fancy',
      data: { title, content }
    });

    return confirm.afterClosed();
  }

  public npcDialog(dialogInfo: IDialogChatAction) {
    if (this.npcDialogRef) return null;

    this.npcDialogRef = this.dialog.open(DialogComponent, {
      width: '450px',
      panelClass: 'fancy',
      data: dialogInfo
    });

    this.npcDialogRef.afterClosed().subscribe((result) => {
      this.npcDialogRef = null;
    });

    return this.npcDialogRef.afterClosed();
  }

  public showAbout() {
    this.dialog.open(AboutComponent, {
      width: '650px',
      panelClass: 'fancy'
    });
  }

  public showAccount() {
    this.dialog.open(AccountComponent, {
      width: '650px',
      panelClass: 'fancy'
    });
  }
}