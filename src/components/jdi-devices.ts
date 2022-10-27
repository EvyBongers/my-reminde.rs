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

    .devices-list {
      border: 1px solid #d3d3d3;
      display: flex;
      flex-direction: column;
    }

    .devices-list mwc-circular-progress {
      margin: 0 auto;
    }

    .device-container {
      cursor: pointer;
      display: flex;
      flex-direction: row;
      padding-left: 12px;
      position: relative;
    }

    .device-container:after {
      border-bottom: 1px solid #d3d3d3;
      content: "";
      display: block;
      margin: 0 1em;
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
    }

    .device-container:last-child:after {
      display: none;
    }

    .device {
      margin-right: auto;
      margin-top: 12px;
    }

    .device h4 {
      margin-block-start: 0;
      margin-block-end: 0;
    }

    .device footer {
      color: rgba(0, 0, 0, 0.54);
      font-size: 0.875rem;
      margin-bottom: 0;
    }
  `;

  renderDevice(deviceId: string, device: any) {
    return html`
      <div class="device-container">
        <div class="device">
          <header>
            <h4 id="title">${device.name}</h4>
          </header>
          <footer>
            ${!device.lastSeen ? "" : html`Last seen ${new Date(device.lastSeen).toLocaleString()}`}
          </footer>
        </div>
      </div>
    `;
  }

  override render() {
    return html`
      <div class="devices-list">
        ${renderItem(this.account, item => html`
          ${Object.entries(item.devices).map(([key, value]) => this.renderDevice(key, value))}
        `, html`
          <mwc-circular-progress indeterminate></mwc-circular-progress>`)}
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
