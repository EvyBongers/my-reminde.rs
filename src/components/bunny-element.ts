import {LitElement, PropertyValues} from "lit";

export class ChangedProperty<T = any> {
  readonly before: T | null;
  readonly after: T | null;

  constructor(before: T | null, after: T | null) {
    this.before = before;
    this.after = after;
  }
}

export type Observer = { callback: (...args: ChangedProperty[]) => any, properties: string[] };

export function observe(...keys: string[]): any {
  return (_proto: any, _propName: string, _descriptor: PropertyDescriptor) => {
    _proto.constructor.__observers.push({
      properties: keys,
      callback: _descriptor.value,
    });
  };
}

export class BunnyElement extends LitElement {
  static __observers: Observer[] = [];

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    let observers = ((this.constructor as any).__observers as Observer[]).filter(_ => _.properties.filter(_ => changedProperties.has(_)).length);
    for (let observer of observers) {
      let callbackArgs: ChangedProperty[] = observer.properties.map(propertyName => new ChangedProperty<any>(changedProperties.get(propertyName), (this as any)[propertyName]));
      observer.callback.apply(this, callbackArgs);
    }
  }

}
