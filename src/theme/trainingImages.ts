import type { ImageSourcePropType } from 'react-native';
import type { TrainingType } from '../types';

/**
 * Cut-out athletes from the design file, sized for the 113x118 card tile.
 *
 * The gym defines its own training types in the admin, so nothing here can key
 * off an id — the match is on words that appear in the type's slug or name,
 * and an unknown type still gets a picture rather than a hole in the card.
 */
const IMAGES = {
  funcional: require('../../assets/trainings/funcional.png'),
  fuerza: require('../../assets/trainings/fuerza.png'),
  cardio: require('../../assets/trainings/cardio.png'),
  movilidad: require('../../assets/trainings/movilidad.png'),
  individual: require('../../assets/trainings/individual.png'),
  default: require('../../assets/trainings/default.png'),
  atleta1: require('../../assets/trainings/atleta1.png'),
  atleta2: require('../../assets/trainings/atleta2.png'),
  atleta3: require('../../assets/trainings/atleta3.png'),
} as const;

/**
 * The pool a slot falls back into when its training type says nothing useful.
 *
 * This gym runs one type all day, so keying only on the type painted the same
 * athlete on every card of the list — which the design does not do. The pick is
 * decorative but deterministic: a given slot always shows the same picture, so
 * the list never reshuffles under you between refreshes.
 */
const POOL: Bucket[] = ['funcional', 'atleta1', 'fuerza', 'atleta2', 'cardio', 'atleta3'];

type Bucket = keyof typeof IMAGES;

const KEYWORDS: [Bucket, string[]][] = [
  ['fuerza', ['fuerza', 'strength', 'pesas', 'levantamiento', 'weight', 'crossfit', 'wod', 'halter']],
  ['cardio', ['cardio', 'hiit', 'spinning', 'bike', 'bici', 'running', 'run', 'quema', 'resistencia']],
  ['movilidad', ['movilidad', 'yoga', 'pilates', 'estiramiento', 'stretch', 'flexibilidad', 'core']],
  ['funcional', ['funcional', 'functional', 'circuito', 'grupal']],
];

/** Strip accents so "móvilidad" and "movilidad" match the same bucket. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** The bucket a training type names outright, if it names one. */
function matchBucket(type: TrainingType): Bucket | null {
  const haystack = normalize(`${type.slug_name} ${type.name}`);
  for (const [bucket, words] of KEYWORDS) {
    if (words.some((word) => haystack.includes(word))) return bucket;
  }
  return null;
}

/**
 * The picture for a training.
 *
 * With no `variant` the answer is purely the discipline. Pass one — a slot id,
 * a row index — and the card joins a rotation that still leads with its own
 * discipline, so a list of six identical "Funcional" slots stops looking like
 * the same card printed six times.
 */
export function trainingImage(type: TrainingType, variant?: number): ImageSourcePropType {
  const matched = matchBucket(type);

  if (variant == null) {
    if (matched) return IMAGES[matched];
    return type.is_group ? IMAGES.default : IMAGES.individual;
  }

  const pool = matched ? [matched, ...POOL.filter((b) => b !== matched)] : POOL;
  return IMAGES[pool[Math.abs(variant) % pool.length]];
}
