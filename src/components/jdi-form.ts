import {css, html, LitElement} from "lit";
import {customElement, property, query, queryAssignedNodes} from "lit/decorators.js";

@customElement("jdi-form")
export class JDIForm extends LitElement {

  @queryAssignedNodes({flatten: true})
  @property()
  public inputs: HTMLElement[];

  @query('form')
  @property()
  public form: HTMLFormElement;

  static override styles = css`
    :host {
      display: block;
    }
  `;

  override render() {
    return html`
      <form @keypress="${this._keypress}" @submit="${this._validate}">
        <slot></slot>
      </form>
    `;
  }

  private _keypress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();

      this.form.dispatchEvent(new Event('submit', {
        bubbles: true,
        composed: true,
        cancelable: true
      }));
    }
  }

  private _validate(e: SubmitEvent) {
    if (!this.reportValidity()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  }

  reportValidity() {
    let valid = true;
    for (let input of this.inputs) {
      if ('reportValidity' in input) {
        if (!(input as any).reportValidity()) {
          valid = false;
        }
      }
    }

    return valid;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    "jdi-form": JDIForm;
  }
}
