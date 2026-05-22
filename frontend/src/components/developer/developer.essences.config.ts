// src/components/developer/developer.essences.config.ts
import TuneIcon from '@mui/icons-material/Tune';
import type { RawEssenceConfig } from '../../types/essence';

export const ESSENCES: RawEssenceConfig[] = [
  {
    parent: 'developer',
    key: 'translations',
    labelKey: 'translations',
    descriptionKey: 'translationsDesc',
    Icon: TuneIcon,
    color: '#6366f1',
  },
];