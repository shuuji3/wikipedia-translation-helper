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
      const linkTag = `<wp_link title="${title}" ja="${title}">${labelText}</wp_link>`
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
      // 1. Check official en -> ja link
      const data = await $fetch<{ targetTitle: string | null }>(apiPath)

      if (data.targetTitle) {
        // Option A: Match found! Create a proper <a> tag for Parsoid
        const replacement = `<a rel="mw:WikiLink" href="./${encodeURIComponent(data.targetTitle)}" title="${data.targetTitle}">${label}</a>`
        return { fullTag, replacement }
      } else {
        // 2. No official link. Check Gemini's suggestion for collision (ja -> en)
        const checkApiPath = `${origin}${config.app.baseURL}api/wiki/langlink?title=${encodeURIComponent(jaTitleLLM)}&from=ja`
        let finalJaTitle = jaTitleLLM
        
        try {
          const checkData = await $fetch<{ targetTitle: string | null }>(checkApiPath)
          if (checkData.targetTitle && checkData.targetTitle !== enTitle) {
            // Collision! Suggest both titles in a minimal format to be easily edited
            finalJaTitle = `${enTitle}/${jaTitleLLM}`
          }
        } catch (e) {
          // If ja-check fails, we stick with Gemini's suggestion
          console.error('Collision check failed for:', jaTitleLLM, e)
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

        // Prepare JSON data for the tooltip
        const tooltipData = {
          type: 'template',
          name: 'Ill',
          params: Object.fromEntries(Object.entries(params).map(([k, v]: [string, any]) => [k, v.wt || '']))
        }

        // Display text in the app: Show label if it exists, otherwise show the first parameter (target title)
        const displayText = (params["label"] ? label : finalJaTitle)
        const replacement = `<span typeof="mw:Transclusion" data-mw='${dataMw.replace(/'/g, "&apos;")}' data-tooltip='${JSON.stringify(tooltipData).replace(/'/g, "&apos;")}'>${displayText}</span>`
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

  // Add tooltip data to normal internal links as well
  finalized = finalized.replace(/<a rel="mw:WikiLink" href="([^"]+)" title="([^"]+)">([^<]+)<\/a>/g, (match, href, title, labelText) => {
    const tooltipData = { type: 'link', title, label: labelText }
    return `<a rel="mw:WikiLink" href="${href}" title="${title}" data-tooltip='${JSON.stringify(tooltipData).replace(/'/g, "&apos;")}'>${labelText}</a>`
  })

  // 2. Restore wp_element placeholders from vault
  // Support both <wp_element_n /> and <wp_element_n></wp_element_n> formats
  finalized = finalized.replace(/<wp_element_(\d+)[^>]*>(?:<\/wp_element_\d+>)?/g, (match, index) => {
    return blockVault[parseInt(index)] || match
  })

  return finalized
}
