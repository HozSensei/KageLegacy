import { watch } from 'vue'
import { useSquadStore } from '../stores/squad'
import { useNotificationCopy } from './useNotificationCopy'
import { useToast } from './useToast'

/** Affiche un toast lorsqu'une nouvelle notification non lue arrive. */
export function useNotificationWatcher() {
  const store = useSquadStore()
  const { title, body } = useNotificationCopy()
  const { push } = useToast()
  let knownIds = new Set()

  watch(
    () => store.notifications,
    (notes) => {
      const list = notes || []
      if (!knownIds.size && list.length) {
        knownIds = new Set(list.map((n) => n.id))
        return
      }
      for (const note of list) {
        if (knownIds.has(note.id)) continue
        knownIds.add(note.id)
        push({
          title: title(note),
          body: body(note),
          kind: 'event',
        })
      }
    },
    { deep: true }
  )
}
