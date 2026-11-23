import { COMPANION_DESK_URL } from '../data/mockData';

export const focusScenes = [
  { id: 'plain', label: 'Plain', level: 1, image: '' },
  { id: 'desk', label: 'Oak desk', level: 1, image: `linear-gradient(#14171f99,#14171fee),url(${COMPANION_DESK_URL})` },
  { id: 'dusk', label: 'Dusk desk', level: 3, image: `linear-gradient(#261b4099,#141326ee),url(${COMPANION_DESK_URL})` },
  { id: 'ocean', label: 'Deep ocean', level: 1, image: 'radial-gradient(ellipse at 70% 20%, #205a72, #081e31 70%)' },
  { id: 'forest', label: 'Forest canopy', level: 2, image: 'radial-gradient(ellipse at 20% 10%, #376455, #10241f 75%)' },
  { id: 'aurora', label: 'Aurora', level: 4, image: 'linear-gradient(135deg, #142845, #214854 38%, #392a62 74%, #15182e)' },
] as const;

export const focusTracks = [
  { id: '', label: 'Off', level: 1 },
  { id: 'quiet-keys', label: 'Quiet keys', level: 1 },
  { id: 'dusk', label: 'Dusk melody', level: 3 },
] as const;
