import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {ifDefined} from 'lit/directives/if-defined.js';
import {BunnyElement, observe} from "./bunny-element";
import {getDocByPath} from "../db";
import {NotificationDocument} from "../../firebase/functions/src";
import {when} from "lit/directives/when.js";

@customElement("notification-redirect")
export class NotificationRedirect extends BunnyElement {

  notification: NotificationDocument;

  @property({type: String})
  accountId: string;

  @property({type: String})
  notificationId: string;

  @property()
  get link() {
    return this.notification?.link;
  }

  static override styles = css`
    :host {
    }
  `;

  @observe('accountId', 'notificationId')
  private async propsUpdated(accountId: string, notificationId: string) {
    console.log("Properties updated!", {"accountId": accountId, "notificationId": notificationId});
    this.notification = await getDocByPath(`accounts/${accountId}/notifications/${notificationId}`) as NotificationDocument;
    this.requestUpdate("notification", undefined);
  }

  override render() {
    return html`
      ${when(this.notification, () => html`
        <p>You're about to leave My Reminde.rs, click the link below to proceed.</p>
        <p><a href="${this.link}">${this.link}</a></p>
      `, () => html`Loading...`)}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-redirect": NotificationRedirect;
  }
}
