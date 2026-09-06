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
} as const;

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

export function trainingImage(type: TrainingType): ImageSourcePropType {
  // The discipline wins over the format: a functional session is a functional
  // picture whether it is booked as a class or one-on-one.
  const haystack = normalize(`${type.slug_name} ${type.name}`);
  for (const [bucket, words] of KEYWORDS) {
    if (words.some((word) => haystack.includes(word))) return IMAGES[bucket];
  }
  return type.is_group ? IMAGES.default : IMAGES.individual;
}
