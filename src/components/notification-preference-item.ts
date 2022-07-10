import {css, html, LitElement} from "lit";
import {customElement, property, queryAll, state} from "lit/decorators.js";
import '@material/mwc-icon';
import '@material/mwc-ripple';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import {IconButton} from "@material/mwc-icon-button";
import {IconButtonToggle} from "@material/mwc-icon-button-toggle";
import {setDocByRef} from "../db";

@customElement("notification-preference-item")
export class NotificationPreferenceItem extends LitElement {

  @property()
  item: any;
  @property()
  originalItem: any;

  @property({type: Boolean})
  protected collapsed: boolean = true;

  @state()
  protected editing: boolean = false;

  @queryAll('mwc-icon-button, mwc-icon-button-toggle')
  private editButtons: NodeListOf<IconButton | IconButtonToggle>;

  static override styles = css`
    :host {
      cursor: pointer;
      display: flex;
      flex-direction: row;
      padding: 0 16px;
      position: relative;
    }

    :host > mwc-icon {
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

    [contenteditable='true'] {
      border-bottom: 1px solid black;
      cursor: text;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('click', _ => {
      if (!this.editing) this.collapsed = !this.collapsed;
    });
  }

  updated() {
    this.editButtons.forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        (e.target as HTMLElement).blur()
      })
    });
  }

  private renderButtons() {
    let saveButton = this.editing ? html`
      <mwc-icon-button outlined icon="check" @click="${this.save}"></mwc-icon-button>
    ` : null;
    return html`
      <aside>
        ${saveButton}
        <mwc-icon-button-toggle outlined onIcon="clear" offIcon="edit" .on="${this.editing}" @click="${this.toggleEdit}"></mwc-icon-button-toggle>
        <mwc-icon-button outlined icon="delete" @click="${this.delete}"></mwc-icon-button>
        <mwc-icon-button-toggle outlined onIcon="notifications_active" offIcon="notifications_off" on></mwc-icon-button-toggle>
      </aside>
    `
  }

  private renderEditing() {
    return html`
      <label>
        Title
        <input value="${this.item.title}"
               @change="${(_: Event) => this.item.title = (_.currentTarget as HTMLInputElement).value}"/>
      </label>
      <label>
        Body
        <input value="${this.item.body}"
               @change="${(_: Event) => this.item.body = (_.currentTarget as HTMLInputElement).value}"/>
      </label>
      <label>
        Schedule
        ${this.item.type === "cron" ?
              html`cron: <input value="${this.item.cronExpression}"
                                @change="${(_: Event) => this.item.cronExpression = (_.currentTarget as HTMLInputElement).value}"/>` :
              html`${this.item.type} (Editing schedule not yet supported)`}
      </label>
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
        ${this.editing ? this.renderEditing() : this.renderPreview()}
        ${this.renderButtons()}
      </div>
      <mwc-icon>${this.collapsed ? "expand_more" : "expand_less"}</mwc-icon>
    `;
  }

  delete(e: Event) {
    if (confirm("Delete this notification?")) {
      console.log("TODO(ebongers): implement deleting notifications")
    }
  }

  save(e: Event) {
    this.editing = false;
    setDocByRef(this.item._ref, this.item, {merge: true});
  }

  toggleEdit(e: Event) {
    this.editing = !this.editing;
    if (this.editing) {
      this.originalItem = structuredClone(this.item);
    } else {
      let changedItem = structuredClone(this.item);
      this.item = this.originalItem;
      this.requestUpdate("item", changedItem);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "notification-preference-item": NotificationPreferenceItem;
  }
}
