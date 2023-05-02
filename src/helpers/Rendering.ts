import {asyncReplace} from "lit/directives/async-replace.js";
import {TemplateResult} from "lit/development";

export const navigate = (
  route: string,
  cases: Array<[string, TemplateResult]>,
  defaultCase?: TemplateResult
): TemplateResult => {
  for (const c of cases) {
    const caseValue = c[0];
    if (caseValue === route) {
      return c[1];
    }
  }
  return defaultCase;
};

export const renderItems = (items: AsyncGenerator<any[]>, render: (item: any, index: number) => any, loading?: any) => {
  if(!items) return loading;

  return asyncReplace((async function* () {
    for await(let subItems of items) {
      yield subItems.map((item, index) => render(item, index));
    }
  })());
};

export const renderItem = (items: AsyncGenerator<any>, render: (item: any) => any, loading?: any) => {
  if(!items) return loading;

  return asyncReplace((async function* () {
    for await(let item of items) {
      yield render(item);
    }
  })());
};
