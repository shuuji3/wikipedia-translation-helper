export default function(message: string): void {
  (document.querySelector('#status') as HTMLParagraphElement).textContent = message
}