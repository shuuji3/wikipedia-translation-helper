import fetchWikitext from "./fetchWikitext";
import fetchLangLink from './fetchLangLink'
import {replaceWikitext} from "./replaceWikitext";

async function eventHandler(e: KeyboardEvent) {
    if (e.key !== 'Enter') {
        return
    }

    const articleName = (document.querySelector('#article-name') as HTMLInputElement).value;

    const langLink = await fetchLangLink(articleName);
    (document.querySelector('#langlink') as HTMLTextAreaElement).value
        = langLink ? `${articleName} => ${langLink}` : 'not found';

    const wikitext = await fetchWikitext(articleName);
    (document.querySelector('#wikitext') as HTMLTextAreaElement).value
        = wikitext ?? 'not found';

    if (wikitext === null) {
        return;
    }
    const replacedWikitext = await replaceWikitext(wikitext);
    (document.querySelector('#replaced-wikitext') as HTMLTextAreaElement).value = replacedWikitext


}

document.addEventListener('DOMContentLoaded', () => {
    const articleNameInput = document.querySelector('#article-name') as HTMLInputElement;
    articleNameInput.addEventListener('keydown', eventHandler);
})
