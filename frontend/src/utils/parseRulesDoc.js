const SLUG_STRIP_PREFIX = /^\d+\.\s*/

export function slugifyHeading(text) {
  return text
    .replace(SLUG_STRIP_PREFIX, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Build a nested TOC from markdown H2 / H3 headings.
 * Update-history sections are omitted from navigation.
 */
export function parseRulesNav(markdown) {
  const sections = []
  const lines = markdown.split('\n')

  for (const line of lines) {
    if (line.startsWith('## ')) {
      const title = line.slice(3).trim()
      if (title.toLowerCase().includes('historique des mises')) continue
      if (title.toLowerCase().includes('update history')) continue
      sections.push({
        id: slugifyHeading(title),
        title,
        children: [],
      })
      continue
    }

    if (line.startsWith('### ') && sections.length) {
      const title = line.slice(4).trim()
      sections[sections.length - 1].children.push({
        id: slugifyHeading(title),
        title,
      })
    }
  }

  return sections
}

/**
 * Filter a nested TOC by a free-text query (case / accent insensitive).
 * A section is kept if its title or any child title matches.
 */
export function filterRulesNav(sections, query) {
  const needle = normalizeSearch(query)
  if (!needle) return sections

  return sections
    .map(section => {
      const sectionMatch = normalizeSearch(section.title).includes(needle)
      const children = (section.children || []).filter(child =>
        normalizeSearch(child.title).includes(needle)
      )
      if (!sectionMatch && !children.length) return null
      return {
        ...section,
        children: sectionMatch ? section.children || [] : children,
      }
    })
    .filter(Boolean)
}

function normalizeSearch(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '')
}

export function addHeadingAnchors(html) {
  return html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, level, inner) => {
    const text = stripTags(inner)
    const id = slugifyHeading(text)
    return `<h${level} id="${id}" class="rules-doc__heading rules-doc__h${level}"><a class="rules-doc__anchor" href="#${id}">${inner}</a></h${level}>`
  })
}
