import { createRoot } from 'react-dom/client';
import '@livekit/components-styles';
import './widget.css';
import { VoiceWidget } from './VoiceWidget';

const MOUNT_ID = 'dalab-voice-widget';

function mount() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) {
    console.warn(`[dalab-vw] no #${MOUNT_ID} element found; widget not mounted`);
    return;
  }
  // Guard against double-mount if the script is included more than once.
  if (el.dataset.mounted === 'true') return;
  el.dataset.mounted = 'true';

  const tokenEndpoint = el.dataset.tokenEndpoint || '/getToken';
  const accent = el.dataset.accent || '#002CF2';

  createRoot(el).render(<VoiceWidget tokenEndpoint={tokenEndpoint} accent={accent} />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
