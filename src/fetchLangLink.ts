async function fetchLangLink(articleName: string): Promise<string|null> {
    /*
        langlinks.js
        MediaWiki API Demos
        Demo of `Langlinks` module: Get a list of language links that a given page has
        MIT License
    */

    const params = {
        action: "query",
        titles: articleName,
        prop: "langlinks",
        format: "json",
        lllang: "ja",
    };

    let url = "https://en.wikipedia.org/w/api.php?origin=*";
    Object.keys(params).forEach(function (key) {
        // @ts-ignore
        url += "&" + key + "=" + params[key];
    });


    const req = await fetch(url);
    const json = await req.json();
    if (!('pages' in json.query)) {
        return null;
    }
    const pageID = parseInt(Object.keys(json.query.pages)[0]);
    const langlinks = json.query.pages[pageID].langlinks;
    if (!langlinks) {
        return null;
    }
    return langlinks[0]['*']
}

export default fetchLangLink;