import {css, html, LitElement} from "lit";
import {customElement, property, query, queryAll, state} from "lit/decorators.js";
import {Dialog} from "@material/mwc-dialog";
import {IconButton} from "@material/mwc-icon-button";
import {IconButtonToggle} from "@material/mwc-icon-button-toggle";
import "@material/mwc-dialog";
import "@material/mwc-icon";
import "@material/mwc-ripple";
import "@material/mwc-icon-button";
import "@material/mwc-icon-button-toggle";
import {setDocByRef} from "../db";

@customElement("notification-preference-item")
export class NotificationPreferenceItem extends LitElement {

  @property()
  item: any;
  @property()
  editingItem: any;

  @property({type: Boolean})
  protected collapsed: boolean = true;

  @queryAll('mwc-icon-button, mwc-icon-button-toggle')
  private editButtons: NodeListOf<IconButton | IconButtonToggle>;

  @query('mwc-dialog#editing')
  private editDialog: Dialog;

  static override styles = css`
    :host {
      cursor: pointer;
      display: flex;
      flex-direction: row;
      padding: 0 16px;
      position: relative;
    }

    .buttons {
      margin: 12px 0 12px auto;
    }

    .notification {
      margin-top: 12px;
    }

    .notification h4 {
      margin-block-start: 0;
      margin-block-end: 0;
    }

    .notification p {
      margin-block-start: 0.5em;
      margin-block-end: 0.5em;
    }

    .notification mwc-icon-button, .notification mwc-icon-button-toggle {
      --mdc-icon-button-size: 30px;
      --mdc-icon-size: 18px;
    }

    .notification footer {
      margin-bottom: 12px;
    }

    .notification aside {
      position: absolute;
      bottom: 0;
      right: 0;
      margin: 6px 12px;
    }

    .notification[collapsed] aside, .notification[collapsed] p {
      display: none;
    }

    .notification[collapsed] footer {
      color: rgba(0, 0, 0, 0.54);
      font-size: 0.875rem;
      margin-bottom: 0;
    }

    #editing {
      --mdc-dialog-min-width: 300px;
    }

    #editing mwc-textfield {
      display: block;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('click', _ => {
      if (!this.editDialog.open) this.collapsed = !this.collapsed;
    });
  }

  updated() {
    this.editButtons.forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        (e.target as HTMLElement).blur()
      })
    });
    this.editDialog.addEventListener('click', (e: Event) => {
      e.stopPropagation();
    });
  }

  private renderButtons() {
    return html`
      <aside>
        <mwc-icon-button outlined icon="edit" @click="${this.edit}"></mwc-icon-button>
        <mwc-icon-button outlined icon="delete" @click="${this.delete}"></mwc-icon-button>
        <mwc-icon-button-toggle outlined onIcon="notifications_active" offIcon="notifications_off"
                                on></mwc-icon-button-toggle>
      </aside>
    `
  }

  private renderEditing() {
    this.editingItem = structuredClone(this.item);
    return html`
      <mwc-dialog id="editing" heading="Editing notification: ${this.item.title}" escapeKeyAction="${this.cancel}"
                  scrimClickAction="${this.cancel}">
        <div>
          <mwc-textfield .value="${this.editingItem?.title}" label="Title" required
                         @input="${(_: Event) => this.editingItem.title = (_.currentTarget as HTMLInputElement).value}"
                         type="text"></mwc-textfield>
          <br>
          <mwc-textfield .value="${this.editingItem?.body}" label="Body"
                         @input="${(_: Event) => this.editingItem.body = (_.currentTarget as HTMLInputElement).value}"
                         type="text"></mwc-textfield>
          <br>
          <mwc-textfield .value="${this.editingItem?.cronExpression}" label="Schedule" required
                         @input="${(_: Event) => this.editingItem.cronExpression = (_.currentTarget as HTMLInputElement).value}"
                         type="text"></mwc-textfield>
        </div>
        <mwc-button slot="primaryAction" @click="${this.save}" dialogAction="close">Save</mwc-button>
        <mwc-button slot="secondaryAction" @click="${this.cancel}" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  private renderPreview() {
    return html`
      <h4 id="title">${this.item.title}</h4>
      <p id="body">${this.item.body}</p>
      <footer>
        Schedule: ${this.item.type === "cron" ? html`cron: <code>${this.item.cronExpression}</code>` : this.item.type}
      </footer>
    `;
  }

  override render() {
    return html`
      <div class="notification" ?collapsed="${this.collapsed}">
        ${this.renderPreview()}
        ${this.renderButtons()}
      </div>
      <div class="buttons">
        <mwc-icon>${this.collapsed ? "expand_more" : "expand_less"}</mwc-icon>
      </div>
      ${this.renderEditing()}
    `;
  }

  delete(e: Event) {
    if (confirm("Delete this notification?")) {
      console.log("TODO(ebongers): implement deleting notifications")
    }
  }

  save(e: Event) {
    setDocByRef(this.item._ref, this.editingItem, {merge: true});
    this.editDialog.close();
  }

  cancel(e: Event) {
    this.editDialog.close();
  }

  edit(e: Event) {
    this.editingItem = structuredClone(this.item);
    this.editDialog.show();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preference-item": NotificationPreferenceItem;
  }
}
