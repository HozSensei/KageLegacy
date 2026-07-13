import { computed, unref } from 'vue'

/** Structure de navigation regroupée par domaine de jeu. */
export function useNavStructure({ navItems, isActive, t }) {
  const items = computed(() => unref(navItems) || [])

  const groups = computed(() => {
    const byName = new Map(items.value.map((item) => [item.name, item]))

    const pick = (...names) => names.map((name) => byName.get(name)).filter(Boolean)

    const sections = [
      {
        id: 'hub',
        labelKey: 'nav.groups.hub',
        items: pick('bureau', 'journal', 'profile'),
      },
      {
        id: 'squad',
        labelKey: 'nav.groups.squad',
        items: pick('squad', 'training', 'clan'),
      },
      {
        id: 'missions',
        labelKey: 'nav.groups.missions',
        items: pick('missions', 'reconnaissance', 'scout', 'league', 'operation'),
      },
      {
        id: 'economy',
        labelKey: 'nav.groups.economy',
        items: pick('market', 'refinement', 'exchanges', 'inventory'),
      },
      {
        id: 'extra',
        labelKey: 'nav.groups.extra',
        items: pick('elite-tools', 'admin'),
      },
    ]

    return sections.filter((section) => section.items.length > 0)
  })

  const currentSectionLabel = computed(() => {
    const active = items.value.find((item) => isActive(item.path))
    return active ? t(active.label) : ''
  })

  return { groups, currentSectionLabel }
}
