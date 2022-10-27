import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {BunnyElement, observe} from "./bunny-element";
import {DataSupplier, loadDocument} from "../db";
import {getDeviceId} from "../helpers/Device";
import {renderItem} from "../helpers/Rendering";
import {disablePushNotifications} from "../messaging";
import "@material/mwc-icon-button";

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

    mwc-icon {
      width: var(--mdc-icon-size, 24px);
      height: var(--mdc-icon-size, 24px);
      padding: calc((var(--mdc-icon-button-size, 48px) - var(--mdc-icon-size, 24px)) / 2);
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
        <div class="actions">
          <mwc-icon-button data-device-id="${deviceId}" data-device-name="${device.name}"
                           @click="${this.unsubscribeDevice}" icon="cancel"></mwc-icon-button>
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
  private async accountChanged(accountId: string) {
    this.account = loadDocument<any>(`accounts/${accountId}`);
  }

  private async unsubscribeDevice(e: Event) {
    e.stopPropagation();
    (e.target as HTMLElement).blur()

    const eventDataset = (e.currentTarget as HTMLElement | LitElement).dataset;
    let dialog = document.createElement("confirm-dialog");
    dialog.append(`Are you sure you want to disable reminders for ${eventDataset.deviceName}?`);
    dialog.setAttribute("confirmLabel", "Confirm");
    dialog.setAttribute("cancelLabel", "Cancel");
    dialog.addEventListener("confirm", _ => {
      disablePushNotifications(eventDataset.deviceId);
    });
    dialog.addEventListener("closed", _ => {
      this.renderRoot.removeChild(dialog);
    });
    this.shadowRoot.append(dialog);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-devices": JDIDevices;
  }
}
