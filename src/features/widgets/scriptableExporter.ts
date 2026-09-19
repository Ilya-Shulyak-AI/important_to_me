import { SCRIPTABLE_DATA_FILENAME, SCRIPTABLE_SCRIPT_FILENAME } from '../../constants';
import { SCRIPTABLE_WIDGET_SOURCE } from './scriptableWidgetSource';

export async function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: filename.endsWith('.json') ? 'application/json' : 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const copyWidgetScript = () => copyText(SCRIPTABLE_WIDGET_SOURCE);
export const downloadWidgetScript = () => downloadText(SCRIPTABLE_SCRIPT_FILENAME, SCRIPTABLE_WIDGET_SOURCE);
export const copyWidgetData = (json: string) => copyText(json);
export const downloadWidgetData = (json: string) => downloadText(SCRIPTABLE_DATA_FILENAME, json);

export async function shareText(title: string, text: string, filenameHint?: string): Promise<'shared' | 'copied'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const data: ShareData = { title, text };
      if (filenameHint && navigator.canShare) {
        const blob = new Blob([text], { type: filenameHint.endsWith('.json') ? 'application/json' : 'text/javascript' });
        const file = new File([blob], filenameHint, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title, files: [file] });
          return 'shared';
        }
      }
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      // user cancel or unsupported — fall through to copy
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
    }
  }
  await copyText(text);
  return 'copied';
}

export const shareWidgetScript = () => shareText('Important to Me Widget Script', SCRIPTABLE_WIDGET_SOURCE, SCRIPTABLE_SCRIPT_FILENAME);
export const shareWidgetData = (json: string) => shareText('Important to Me Widget Data', json, SCRIPTABLE_DATA_FILENAME);
