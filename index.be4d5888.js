var e=async function e(t){const n="https://en.wikipedia.org/w/api.php?"+new URLSearchParams({origin:"*",action:"parse",page:t,format:"json",prop:"wikitext"}),a=await fetch(n),r=await a.json();if(!r.parse)return null;const o=r.parse.wikitext["*"],l=function(e){const t=/#REDIRECT.+\[\[(.+)]]/.exec(e);return null!==t?t[1]:null}(o);return null!==l?e(l):o};var t=async function(e){if(e in localStorage){const t=localStorage.getItem(e);return""===t?null:t}const t={action:"query",titles:e,prop:"langlinks",format:"json",lllang:"ja"};let n="https://en.wikipedia.org/w/api.php?origin=*";Object.keys(t).forEach((function(e){n+="&"+e+"="+t[e]}));const a=await fetch(n),r=await a.json();if(!("pages"in r.query))return localStorage.setItem(e,""),null;const o=parseInt(Object.keys(r.query.pages)[0]),l=r.query.pages[o].langlinks;if(!l)return localStorage.setItem(e,""),null;const i=l[0]["*"];return localStorage.setItem(e,i),i};async function n(e){let n=e;const a=function(e){return[...new Set([...e.matchAll(/\[\[(.+?)]]/g)].map((e=>e[1]))).keys()].map((e=>e.split("|"))).filter((e=>e.length<=2))}(e);for(const[e,r]of a){if(r)continue;const a=await t(e),o=new RegExp(String.raw`\[\[${e}]]`,"g"),l=null===a?`{{ill|${e}|en|${e}}}`:`[[${a}]]`;n=n.replace(o,l)}return n}async function a(a){if("Enter"!==a.key)return;const r=document.querySelector("#article-name").value,o=await t(r);document.querySelector("#langlink").value=o?`${r} => ${o}`:"not found";const l=await e(r);if(document.querySelector("#wikitext").value=l??"not found",null===l)return;const i=await n(l);document.querySelector("#replaced-wikitext").value=i}document.addEventListener("DOMContentLoaded",(()=>{document.querySelector("#article-name").addEventListener("keydown",a)}));
//# sourceMappingURL=index.be4d5888.js.map
