import fetchLangLink from "./fetchLangLink";

function findWikiLinks(wikitext: string) {
    let wikiLinkSet = new Set([...wikitext.matchAll(/\[\[(.+?)]]/g)].map(m => m[1])).keys();
    return [...wikiLinkSet].map(link => link.split('|')).filter(s => s.length <= 2);
}

export async function replaceWikitext(wikitext: string) {
    let replacedWikitext = wikitext
    const links = findWikiLinks(wikitext);
    for (const [articleName, label] of links) {
        if (label) {
            continue;
        }
        const langlink = await fetchLangLink(articleName)
        const targetRegex = new RegExp(String.raw`\[\[${articleName}]]`, 'g');
        const newWikiLink =
            langlink === null ? `{{ill|${articleName}|en|${articleName}}}` : `[[${langlink}]]`;
        replacedWikitext = replacedWikitext.replace(targetRegex, newWikiLink);
    }

    return replacedWikitext
}