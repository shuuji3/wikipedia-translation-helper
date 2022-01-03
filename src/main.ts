import fetchWikitext from "./fetchWikitext";
import fetchLangLink from './fetchLangLink'
import {convertWikilink} from "./convertWikilink";

async function fetchArticleHandler() {
    const articleName = (document.querySelector('#article-name') as HTMLInputElement).value;

    const langLink = await fetchLangLink(articleName);
    (document.querySelector('#langlink') as HTMLTextAreaElement).value
      = `${articleName} => ${langLink ?? 'not found'}`;

    const wikitext = await fetchWikitext(articleName);
    (document.querySelector('#wikitext') as HTMLTextAreaElement).value
      = wikitext ?? 'not found';

    if (wikitext === null) {
        return;
    }
}

async function convertWikilinkHandler() {
    const wikitext = (document.querySelector('#wikitext') as HTMLTextAreaElement).value
    const convertedWikitext = await convertWikilink(wikitext);
    (document.querySelector('#replaced-wikitext') as HTMLTextAreaElement).value = convertedWikitext
}

document.addEventListener('DOMContentLoaded', () => {
    const articleNameInput = document.querySelector('#article-name') as HTMLInputElement;
    articleNameInput.addEventListener('keydown', (e: KeyboardEvent)  => {
        if (e.key !== 'Enter') {
            return
        }
        fetchArticleHandler()
    });

    const fetchButton = document.querySelector('button#fetch') as HTMLInputElement;
    fetchButton.addEventListener('click', fetchArticleHandler);

    const convertButton = document.querySelector('button#convert') as HTMLInputElement;
    convertButton.addEventListener('click', convertWikilinkHandler);
})
