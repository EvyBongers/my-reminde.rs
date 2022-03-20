import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {login} from "../auth";
import {toastWrapper} from "../helpers/Decorators";

@customElement("jdi-login")
export class JDILogin extends LitElement {
  @property()
  username: string = "";

  @property()
  password: string = "";

  static override styles = css`
    :host {
      display: block;
      border: solid 1px gray;
      padding: 16px;
      max-width: 800px;
    }
  `;

  override render() {
    return html`
      <form>
        <h1>Login</h1>
        <input .value="${this.username}"
               @input="${(_: Event) =>
                     this.username = (_.currentTarget as HTMLInputElement).value}"
               type="text"><br>
        <input .value="${this.password}"
               @input="${(_: Event) =>
                     this.password = (_.currentTarget as HTMLInputElement).value}"
               type="password">
        <button @click=${this._login} part="button">Login</button>
      </form>
    `;
  }

  private _login(e: Event) {
    e.preventDefault();
    this.login();
  }

  @toastWrapper({
    successMessage: "woo logged in",
    progressMessage: "logging in",
    failedMessage: "aaaa you suck",
  })
  private async login() {
    await login(this.username, this.password);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-login": JDILogin;
  }
}
