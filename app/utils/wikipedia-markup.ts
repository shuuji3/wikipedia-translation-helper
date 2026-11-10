/**
 * Wikipedia specific markup handling utilities
 */

export function extractStyles(doc: Document) {
  return Array.from(doc.querySelectorAll('link[rel="stylesheet"], style')).map((el) => {
    let html = el.outerHTML
    // Rewrite relative URLs to absolute Wikipedia URLs
    html = html.replace(/(href|src|url)\s*=\s*["']?\/(?!\/)/g, '$1="https://en.wikipedia.org/')
    html = html.replace(/url\(['"]?\/(?!\/)/g, "url('https://en.wikipedia.org/")
    return html
  })
}

/**
 * Escapes a value for use inside a double-quoted HTML attribute.
 * Wikipedia titles can legally contain quotes, which would
 * otherwise terminate the attribute and corrupt the markup.
 */
function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Escapes a value for use as HTML text content. */
function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Reverses {@link escapeAttribute} for a value read back out of the markup. */
function decodeAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
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
      const labelText = el.textContent || ''
      const linkTag = `<wp_link title="${escapeAttribute(title)}" ja="${escapeAttribute(title)}">${escapeText(labelText)}</wp_link>`
      el.insertAdjacentHTML('beforebegin', linkTag)
      el.remove()
    } else if (el.hasAttribute('typeof')) {
      // It's a special Wikipedia element (Template, Ref, etc.)
      const index = blockVault.length
      blockVault.push(el.outerHTML)
      el.insertAdjacentHTML('beforebegin', `<wp_element_${index} />`)
      el.remove()
    }
  })

  return clone.innerHTML.trim()
}

export async function finalizeTranslation(
  translatedText: string, 
  blockVault: string[],
  config: any,
  referenceMap: Record<string, string> = {}
): Promise<string> {
  let finalized = translatedText

  // 1. Convert wp_link tags using "Triple Magic" (batched API check + dynamic formatting)
  const linkRegex = /<wp_link title="([^"]+)" ja="([^"]+)">([^<]+)<\/wp_link>/g
  const matches = [...finalized.matchAll(linkRegex)]

  // Batch langlink lookups instead of one request per link, and chunk to keep URLs small.
  async function fetchLanglinkBatch(titles: string[], from: 'en' | 'ja'): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {}
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    for (let index = 0; index < titles.length; index += 40) {
      const group = titles.slice(index, index + 40)
      const params = new URLSearchParams({ titles: group.join('|'), from })
      const data = await $fetch<{ results: Record<string, string | null> }>(
        `${origin}${config.app.baseURL}api/wiki/langlink?${params.toString()}`
      )
      Object.assign(results, data.results)
    }
    return results
  }

  const enTitles = [...new Set(matches.map(match => match[1]).filter((title): title is string => !!title))]
  let enLanglinks: Record<string, string | null> = {}
  try {
    enLanglinks = await fetchLanglinkBatch(enTitles, 'en')
  } catch (e) {
    console.error('Langlink batch fetch failed:', e)
  }

  // Only check ja -> en for links that have no official en -> ja link.
  const jaTitles = [...new Set(
    matches
      .filter(match => !enLanglinks[match[1] || ''])
      .map(match => match[2])
      .filter((title): title is string => !!title)
  )]
  let jaLanglinks: Record<string, string | null> = {}
  try {
    jaLanglinks = await fetchLanglinkBatch(jaTitles, 'ja')
  } catch (e) {
    console.error('Langlink collision batch fetch failed:', e)
  }

  const replacements = matches.map((match) => {
    const fullTag = match[0]
    const enTitle = decodeAttribute(match[1] || '')
    const jaTitleLLM = decodeAttribute(match[2] || '')
    const label = decodeAttribute(match[3] || '')

    // 1. Official en -> ja link.
    const officialJaTitle = enLanglinks[enTitle]
    if (officialJaTitle) {
      // Option A: Match found! Create a proper <a> tag for Parsoid
      const replacement = `<a rel="mw:WikiLink" href="./${encodeURIComponent(officialJaTitle)}" title="${escapeAttribute(officialJaTitle)}">${escapeText(label)}</a>`
      return { fullTag, replacement }
    }

    // 2. No official link. Check Gemini's suggestion for collision (ja -> en).
    let finalJaTitle = jaTitleLLM
    const collisionTitle = jaLanglinks[jaTitleLLM]
    if (collisionTitle && collisionTitle !== enTitle) {
      // Collision! Suggest both titles in a minimal format to be easily edited
      finalJaTitle = `${enTitle}/${jaTitleLLM}`
    }

    // Option B: No Japanese article yet (or collision). Create mw:Transclusion HTML for {{ill}}
    const params: any = {
      "1": { wt: finalJaTitle },
      "2": { wt: "en" },
      "3": { wt: enTitle }
    }

    // Only include label if it's different from the target title and no collision occurred
    if (finalJaTitle === jaTitleLLM && jaTitleLLM !== label) {
      params["label"] = { wt: label }
    }

    const dataMw = JSON.stringify({
      parts: [{
        template: {
          target: { wt: "Ill", href: "./Template:Ill" },
          params,
          i: 0
        }
      }]
    })

    // Prepare JSON data for the tooltip and encode it for HTML safety
    const tooltipData = {
      type: 'template',
      name: 'Ill',
      params: Object.fromEntries(Object.entries(params).map(([k, v]: [string, any]) => [k, v.wt || '']))
    }
    const tooltipSafe = encodeURIComponent(JSON.stringify(tooltipData)).replace(/'/g, '%27')

    // Display text in the app: Show label if it exists, otherwise show the first parameter (target title)
    const displayText = (params["label"] ? label : finalJaTitle)
    const replacement = `<span typeof="mw:Transclusion" data-mw='${dataMw.replace(/'/g, "&apos;")}' data-tooltip='${tooltipSafe}'>${escapeText(displayText)}</span>`
    return { fullTag, replacement }
  })

  // Apply link replacements
  replacements.forEach(({ fullTag, replacement }) => {
    if (fullTag && replacement) {
      finalized = finalized.replace(fullTag, replacement)
    }
  })

  // Add tooltip data to normal internal links as well
  finalized = finalized.replace(/<a rel="mw:WikiLink" href="([^"]+)" title="([^"]+)">([^<]+)<\/a>/g, (match, href, title, labelText) => {
    const tooltipData = { type: 'link', title, label: labelText }
    const tooltipSafe = encodeURIComponent(JSON.stringify(tooltipData)).replace(/'/g, '%27')
    return `<a rel="mw:WikiLink" href="${escapeAttribute(href)}" title="${escapeAttribute(title)}" data-tooltip='${tooltipSafe}'>${escapeText(labelText)}</a>`
  })

  // 2. Restore wp_element placeholders from vault
  // Support both <wp_element_n /> and <wp_element_n></wp_element_n> formats
  finalized = finalized.replace(/<wp_element_(\d+)[^>]*>(?:<\/wp_element_\d+>)?/g, (match, index) => {
    const originalHtml = blockVault[parseInt(index)]
    if (!originalHtml) return match

    // If it's a reference (citation), try to add a tooltip
    if (originalHtml.includes('typeof="mw:Extension/ref"')) {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(originalHtml, 'text/html')
        const refEl = doc.body.firstElementChild as HTMLElement
        
        if (refEl) {
          const dataMwAttr = refEl.getAttribute('data-mw')
          const labelText = refEl.textContent?.trim() || 'Ref'
          
          let tooltipData: any = { type: 'reference', label: labelText }
          
          if (dataMwAttr) {
            const data = JSON.parse(dataMwAttr)
            
            // Try to get content directly
            let content = data.body?.extsrc
            
            // If empty, try to look it up from our referenceMap (by name or ID)
            if (!content) {
              if (data.attrs?.name) {
                content = referenceMap[`name:${data.attrs.name}`]
              }
              if (!content) {
                const refId = refEl.getAttribute('id')
                if (refId) content = referenceMap[refId]
              }
            }
            
            if (content) {
              tooltipData.content = content
            }
          }
          
          refEl.setAttribute('data-tooltip', encodeURIComponent(JSON.stringify(tooltipData)))
          return refEl.outerHTML
        }
      } catch (e) {
        console.error('Failed to add tooltip to reference:', e)
      }
    }

    return originalHtml
  })

  return finalized
}
