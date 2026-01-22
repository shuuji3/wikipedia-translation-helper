/**
 * Wikipedia specific markup handling utilities
 */

export function injectStyles(doc: Document, bodyClass: Ref<string>) {
  bodyClass.value = doc.body.className

  const headElements = doc.querySelectorAll('link[rel="stylesheet"], style')
  headElements.forEach((el) => {
    const clone = el.cloneNode(true) as HTMLElement
    if (clone.tagName === 'LINK') {
      const href = clone.getAttribute('href')
      if (href && href.startsWith('/')) {
        clone.setAttribute('href', `https://en.wikipedia.org${href}`)
      }
    }
    const href = clone.getAttribute('href') || (clone.textContent ? 'inline-style' : '')
    const existing = document.head.querySelector(`[href="${href}"]`)
    if (!existing) {
      document.head.appendChild(clone)
    }
  })
}

export function prepareTranslationText(target: HTMLElement, blockVault: string[]): string {
  const clone = target.cloneNode(true) as HTMLElement
  blockVault.length = 0 // Clear the array

  // Handle all elements with 'typeof' (templates, refs, math, etc.)
  // and Wikilinks
  const specialElements = clone.querySelectorAll('[typeof], a[rel="mw:WikiLink"]')

  specialElements.forEach(el => {
    // Check if it's a Wikilink
    if (el.tagName === 'A' && el.getAttribute('rel') === 'mw:WikiLink') {
      const href = el.getAttribute('href') || ''
      const title = decodeURIComponent(href.replace(/^\.\//, '')).replace(/_/g, ' ')
      const label = el.textContent || ''
      const linkTag = `<wp_link title="${title}" ja="${title}">${label}</wp_link>`
      el.replaceWith(document.createTextNode(linkTag))
    } else if (el.hasAttribute('typeof')) {
      // It's a special Wikipedia element (Template, Ref, etc.)
      const index = blockVault.length
      blockVault.push(el.outerHTML)
      el.replaceWith(document.createTextNode(`<wp_element_${index} />`))
    }
  })

  return clone.textContent?.trim() || ''
}

export async function finalizeTranslation(
  translatedText: string, 
  blockVault: string[],
  config: any
): Promise<string> {
  let finalized = translatedText

  // 1. Convert wp_link tags using "Triple Magic" (API check + dynamic formatting)
  const linkRegex = /<wp_link title="([^"]+)" ja="([^"]+)">([^<]+)<\/wp_link>/g
  const matches = [...finalized.matchAll(linkRegex)]

  // Fetch langlinks for all found English titles in parallel
  const replacements = await Promise.all(matches.map(async (match) => {
    const fullTag = match[0]
    const enTitle = match[1] || ''
    const jaTitleLLM = match[2] || ''
    const label = match[3] || ''
    try {
      // Use useRequestURL if in composable, but here we expect the origin to be passed or derived
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const apiPath = `${origin}${config.app.baseURL}api/wiki/langlink?title=${encodeURIComponent(enTitle)}`
      const data = await $fetch<{ jaTitle: string | null }>(apiPath)

      if (data.jaTitle) {
        // Option A: Japanese article exists! Create a proper <a> tag for Parsoid
        const replacement = `<a rel="mw:WikiLink" href="./${encodeURIComponent(data.jaTitle)}" title="${data.jaTitle}">${label}</a>`
        return { fullTag, replacement }
      } else {
        // Option B: No Japanese article yet. Create mw:Transclusion HTML for {{ill}}
        const dataMw = JSON.stringify({
          parts: [{
            template: {
              target: { wt: "Ill", href: "./Template:Ill" },
              params: {
                "1": { wt: jaTitleLLM },
                "2": { wt: "en" },
                "3": { wt: enTitle },
                "label": { wt: label }
              },
              i: 0
            }
          }]
        })
        const replacement = `<span typeof="mw:Transclusion" data-mw='${dataMw.replace(/'/g, "&apos;")}'>${label}</span>`
        return { fullTag, replacement }
      }
    } catch (e) {
      console.error('Langlink API failed for:', enTitle, e)
      return { fullTag, replacement: label }
    }
  }))

  // Apply link replacements
  replacements.forEach(({ fullTag, replacement }) => {
    if (fullTag && replacement) {
      finalized = finalized.replace(fullTag, replacement)
    }
  })

  // 2. Restore wp_element placeholders from vault
  finalized = finalized.replace(/<wp_element_(\d+)\s*\/>/g, (match, index) => {
    return blockVault[parseInt(index)] || match
  })

  return finalized
}
