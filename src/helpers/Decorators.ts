import {showMessage} from "./Snacks";

interface ToastWrapperOptions {
  successMessage?: string;
  failedMessage?: string;
  progressMessage?: string;
}

export function toastWrapper(options: ToastWrapperOptions | null = null) {
  return (_proto: any, _propName: string, descriptor: PropertyDescriptor) => {
    let oldFunction = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let me = this as any;

      let snack;
      try {
        if (options.progressMessage) {
          snack = showMessage(options.progressMessage, {timeoutMs: -1});
        }


        if (await (oldFunction.apply(me, args) as any) === -1) {
          return;
        }

        if (options.successMessage) {
          showMessage(options.successMessage, {timeoutMs: 4000}, snack);
        }

      } catch (e) {
        if (options.failedMessage) {
          showMessage(options.failedMessage.replace('{{e}}', e.message), {timeoutMs: 7000}, snack);
        }

        throw e;
      }
    };
  };
}