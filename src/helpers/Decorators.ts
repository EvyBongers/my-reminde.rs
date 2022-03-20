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

      try {
        if (options.progressMessage) {
          alert(options.progressMessage);
        }


        if (await (oldFunction.apply(me, args) as any) === -1) {
          return;
        }

        if (options.successMessage) {
          alert(options.successMessage);
        }

      } catch (e) {
        if (options.failedMessage) {
          alert(options.failedMessage.replace('{{e}}', e.message));
        }

        throw e;
      }
    };
  };
}