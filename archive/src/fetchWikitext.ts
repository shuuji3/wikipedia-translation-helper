import showStatus from "./showStatus";

async function fetchWikitext(articleName: string): Promise<string|null> {
    /**
     * parse.js
     *
     * MediaWiki API Demos
     * Demo of `Parse` module: Parse content of a page
     *
     * MIT License
     */

    showStatus(`Loading "${articleName}" article text...`)

    const url = "https://en.wikipedia.org/w/api.php?" +
        new URLSearchParams({
            origin: "*",
            action: "parse",
            page: articleName,
            format: "json",
            prop: 'wikitext',
        });

    const req = await fetch(url);
    const json = await req.json();
    if (!json.parse) {
        showStatus(`Could not load "${articleName}"`)
        return null;
    }
    const wikitext = json.parse.wikitext["*"];

    const redirectArticleName = getRedirect(wikitext)
    if (redirectArticleName !== null) {
        return fetchWikitext(redirectArticleName)
    }
    showStatus('')
    return wikitext
}

function getRedirect(wikitext: string) {
    const match = /#REDIRECT.+\[\[(.+)]]/.exec(wikitext)
    if (match !== null) {
        return match[1]
    }
    return null
}

export default fetchWikitext;