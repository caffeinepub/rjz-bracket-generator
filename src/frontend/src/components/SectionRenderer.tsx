import { renderMarkdown } from "./markdownUtils";

interface Section {
  title: string;
  content: string;
}

function parseSections(raw: string): Section[] {
  if (!raw.trim()) return [];
  if (!raw.includes("<!-- SECTION:")) {
    return [{ title: "", content: raw }];
  }
  const sections: Section[] = [];
  const parts = raw.split(/(<!-- SECTION: .+? -->)/);
  let pendingTitle = "";
  for (const part of parts) {
    const headerMatch = part.match(/<!-- SECTION: (.+?) -->/);
    if (headerMatch) {
      pendingTitle = headerMatch[1];
    } else if (pendingTitle !== null) {
      sections.push({ title: pendingTitle, content: part.trim() });
      pendingTitle = "";
    } else if (part.trim()) {
      sections.push({ title: "", content: part.trim() });
    }
  }
  return sections.filter((s) => s.content || s.title);
}

interface SectionRendererProps {
  description: string;
}

export default function SectionRenderer({ description }: SectionRendererProps) {
  if (!description?.trim()) return null;

  const sections = parseSections(description);
  if (sections.length === 0) return null;

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={`${section.title}-${section.content.slice(0, 20)}`}>
          {section.title && (
            <h3 className="mb-1.5 font-display text-sm font-bold uppercase tracking-widest text-foreground">
              {section.title}
            </h3>
          )}
          {section.content && (
            <div
              className="text-sm text-muted-foreground prose-preview [&_a]:text-primary [&_a:hover]:opacity-80 [&_strong]:text-foreground"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized markdown
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(section.content),
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
