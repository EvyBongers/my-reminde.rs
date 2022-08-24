import {LitElement} from "lit";
import {property} from "lit/decorators.js";
import {ReminderDocument} from "../../firebase/functions/src/index"

export class ReminderBase extends LitElement {

  @property()
  item: ReminderDocument;
}
