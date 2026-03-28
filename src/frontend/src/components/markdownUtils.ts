/**
 * Minimal markdown renderer — no external deps.
 * Supports: **bold**, *italic*, [link](url), - lists, \n newlines.
 */
export function renderMarkdown(text: string): string {
  // Escape HTML entities first
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Process bullet lists (lines starting with - or *)
  const lines = html.split("\n");
  const processed: string[] = [];
  let inList = false;
  for (const line of lines) {
    const listMatch = line.match(/^[-*]\s+(.+)/);
    if (listMatch) {
      if (!inList) {
        processed.push("<ul class='list-disc pl-4 space-y-0.5'>");
        inList = true;
      }
      processed.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) {
        processed.push("</ul>");
        inList = false;
      }
      processed.push(line);
    }
  }
  if (inList) processed.push("</ul>");
  html = processed.join("\n");

  // Inline: bold, italic, links
  html = html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );

  // Convert newlines outside lists to <br>
  html = html.replace(/\n/g, "<br />");

  return html;
}
