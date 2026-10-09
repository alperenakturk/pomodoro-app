import { useSyncExternalStore } from 'react'
import { hasSyncFailure, subscribeSyncStatus } from '../lib/storage'

export function useSyncFailure() {
  return useSyncExternalStore(subscribeSyncStatus, hasSyncFailure)
}
