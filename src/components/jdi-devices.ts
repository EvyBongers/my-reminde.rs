import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {BunnyElement, observe} from "./bunny-element";
import {DataSupplier, loadDocument} from "../db";
import {getDeviceId} from "../helpers/Device";
import {renderItem} from "../helpers/Rendering";

@customElement("jdi-devices")
export class JDIDevices extends BunnyElement {

  @property()
  account: DataSupplier<any>;

  @property({type: String})
  accountId: string;

  static override styles = css`
    :host {
      display: block;
    }
  `;

  renderDevice(deviceId: string, device: any) {
    return html`
      <li data-id="${deviceId}" data-token="${device.token}">
        ${device.name}${deviceId == getDeviceId() ? " (this device)" : ""}
      </li>
    `;
  }

  override render() {
    // TODO: Move wrapping element (ul) inside renderItem...?
    return html`
      <div>
        <h3>Subscribed devices</h3>
        <ul>
          ${renderItem(this.account, item => html`
            ${Object.entries(item.devices).map(([key, value]) => this.renderDevice(key, value))}
          `, html`Loading devices`)}
        </ul>
      </div>
    `;
  }

  @observe('accountId')
  accountChanged(accountId: string) {
    this.account = loadDocument<any>(`accounts/${accountId}`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-devices": JDIDevices;
  }
}
