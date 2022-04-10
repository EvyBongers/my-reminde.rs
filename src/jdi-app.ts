import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import './components/jdi-login';
import './components/jdi-logout';
import {onAuthStateChanged} from "firebase/auth";
import {auth} from "./auth";
import firebase from "firebase/compat";

@customElement("jdi-app")
export class JDIApp extends LitElement {

  @property()
  user: any;

  static override styles = css`
    :host {
      display: block;
    }
  `;

  renderLoggedIn() {
    return html`
      <h1>Hurray!</h1>
      <mwc-button outlined id="enablePush">Enable notifications</mwc-button>
      <br>
      <mwc-button outlined id="send">Send a message</mwc-button>
      <br>
      <jdi-logout></jdi-logout>
    `;
  }

  renderLoggedOut() {
    return html`
      <jdi-login></jdi-login>
    `;
  }

  override render() {
    return html`
      ${this.user ? this.renderLoggedIn() : this.renderLoggedOut()}
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    onAuthStateChanged(auth, (user) => {
      this.user = user;
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-app": JDIApp;
  }
}
