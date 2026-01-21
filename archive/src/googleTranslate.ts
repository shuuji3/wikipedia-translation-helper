const apiKey = 'AIzaSyAew5zvKW6uGLqj_xVwIXd1ZJdByKHBY9I'

export default async function (text: string) {
  const data = {
    q: text,
    source: 'en',
    target: 'ja',
    format: 'text',
  };
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return (await res.json()).data.translations[0].translatedText;
}
