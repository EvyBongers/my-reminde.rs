import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {DataCollectionSupplier, DataSupplier, db, loadCollection, loadDocument} from "../db";
import {renderItem, renderItems} from "../helpers/Rendering";

@customElement("jdi-devices")
export class JDIDevices extends LitElement {

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
      ${deviceId} -
      <pre>
        ${JSON.stringify(device, null, 4)}
      </pre>
    `;
  }

  override render() {
    return html`
      <div>
        ${renderItem(this.account, item => html`
          ${Object.entries(item.devices).map(([key, value]) => this.renderDevice(key, value))}
        `, html`Loading devices`)}
      </div>
    `;
  }

  updated(changedProperties: any) {
    if (changedProperties.has('accountId')) {
      this.account = loadDocument<any>(`accounts/${this.accountId}`);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-devices": JDIDevices;
  }
}
