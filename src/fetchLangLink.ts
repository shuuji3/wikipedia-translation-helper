async function fetchLangLink(articleName: string): Promise<string|null> {
    /*
        langlinks.js
        MediaWiki API Demos
        Demo of `Langlinks` module: Get a list of language links that a given page has
        MIT License
    */

    if (articleName in localStorage) {
        const langlink = localStorage.getItem(articleName) as string;
        if (langlink === '') {
            return null;
        }
        return langlink;
    }

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
        localStorage.setItem(articleName, '');
        return null;
    }
    const pageID = parseInt(Object.keys(json.query.pages)[0]);
    const langlinks = json.query.pages[pageID].langlinks;
    if (!langlinks) {
        localStorage.setItem(articleName, '');
        return null;
    }

    const langlink = langlinks[0]['*'];
    localStorage.setItem(articleName, langlink);

    return langlink;
}

export default fetchLangLink;