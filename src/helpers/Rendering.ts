import {TemplateResult} from "lit";
import {asyncReplace} from "lit/directives/async-replace.js";

export type renderOptions = {
  loading?: TemplateResult
  placeHolder?: TemplateResult
}

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

export const renderItems = (items: AsyncGenerator<any[]>, render: (item: any, index: number) => any, options?: renderOptions | any) => {
  if (!items) return options?.loading ? options.loading : options;

  return asyncReplace((async function* () {
    for await(let subItems of items) {
      yield (subItems.length === 0 && options?.placeHolder) ? options.placeHolder : subItems.map((item, index) => render(item, index));
    }
  })());
};

export const renderItem = (items: AsyncGenerator<any>, render: (item: any) => any, options?: renderOptions | any) => {
  if (!items) return options?.loading ? options.loading : options;

  return asyncReplace((async function* () {
    for await(let item of items) {
      yield (!item && options?.placeHolder) ? options.placeHolder : render(item);
    }
  })());
};
