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

export function parseRulesNav(markdown) {
  const sections = []
  const lines = markdown.split('\n')

  for (const line of lines) {
    if (!line.startsWith('## ')) continue
    const title = line.slice(3).trim()
    if (title.toLowerCase().includes('historique des mises')) continue
    if (title.toLowerCase().includes('update history')) continue
    sections.push({
      id: slugifyHeading(title),
      title,
    })
  }

  return sections
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
