/**
 * LoadingState — thin re-export alias for the LoadingStates component.
 *
 * Both names refer to the same implementation so that callers can use
 * whichever name reads more naturally:
 *
 *   import LoadingState from '@/components/ui/LoadingState';
 *   // or
 *   import LoadingStates from '@/components/ui/LoadingStates';
 */
export {
  default,
  useLoadingState,
} from './LoadingStates';

export type { LoadingStateProps } from './LoadingStates';
