import {Snackbar} from '@material/mwc-snackbar';
import '@material/mwc-snackbar';

export const showMessage = (message: string, options?: { timeoutMs: number }, existingSnack?: Snackbar,) => {
  if (existingSnack) {
    existingSnack.removeEventListener('MDCSnackbar:closed', (existingSnack as any).__unstacker);
    existingSnack.close();
  }

  let snack = existingSnack || document.createElement('mwc-snackbar') as Snackbar;
  snack.labelText = message;
  document.body.appendChild(snack);

  if (options?.timeoutMs) {
    snack.timeoutMs = options.timeoutMs;
  }

  snack.show();
  (snack as any).__unstacker = () => {
    snack.parentElement.removeChild(snack);
  };
  snack.addEventListener('MDCSnackbar:closed', (snack as any).__unstacker);

  return snack;
};
