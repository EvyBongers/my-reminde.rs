import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {asyncReplace} from 'lit/directives/async-replace.js';
import {DocumentData} from "firebase/firestore";
import {getDoc, setDoc} from "../db";
import './jdi-form';

@customElement("jdi-devices")
export class JDIDevices extends LitElement {
  @property()
  username: string = "";

  @property()
  password: string = "";

  @property()
  devices: DocumentData = this.fetchDevices();

  static override styles = css`
    :host {
      display: block;
      border: solid 1px gray;
      padding: 16px;
      max-width: 800px;
    }
  `;

  /*
    deviceId: {
      name: deviceName,
      token: token
    }
   */
  override render() {
    return html`
      <ul>
        ${asyncReplace(this.devices, (data: DocumentData) => html`<li>${JSON.stringify(data)}</li>`)}
      </ul>
    `;

  }

  async fetchDevices() {
    yield getDoc("/accounts/{accountId}/devices");
  }

  // private _login(e: Event) {
  //   e.preventDefault();
  //   this.login();
  // }
  //
  // @toastWrapper({
  //   successMessage: "woo logged in",
  //   progressMessage: "logging in",
  //   failedMessage: "aaaa you suck: {{e}}",
  // })
  // private async login() {
  //   await login(this.username, this.password);
  // }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-devices": JDIDevices;
  }
}
