import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { renderMarkdown } from "./markdownUtils";

interface Section {
  id: string;
  title: string;
  content: string;
}

interface SectionEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function parseSections(raw: string): Array<{ title: string; content: string }> {
  if (!raw.trim()) return [];
  if (!raw.includes("<!-- SECTION:")) {
    return [{ title: "", content: raw }];
  }
  const result: Array<{ title: string; content: string }> = [];
  const parts = raw.split(/(<!-- SECTION: .+? -->)/);
  let pendingTitle = "";
  for (const part of parts) {
    const headerMatch = part.match(/<!-- SECTION: (.+?) -->/);
    if (headerMatch) {
      pendingTitle = headerMatch[1];
    } else if (pendingTitle !== null) {
      result.push({ title: pendingTitle, content: part.trim() });
      pendingTitle = "";
    } else if (part.trim()) {
      result.push({ title: "", content: part.trim() });
    }
  }
  return result.length > 0 ? result : [];
}

function serializeSections(
  sections: Array<{ title: string; content: string }>,
): string {
  if (sections.length === 0) return "";
  if (sections.length === 1 && !sections[0].title.trim()) {
    return sections[0].content;
  }
  return sections
    .map((s) => `<!-- SECTION: ${s.title || "Section"} -->\n${s.content}`)
    .join("\n\n");
}

let uid = 0;
function nextId() {
  return `sec-${++uid}`;
}

export default function SectionEditor({ value, onChange }: SectionEditorProps) {
  const [sections, setSections] = useState<Section[]>(() =>
    parseSections(value).map((s) => ({ ...s, id: nextId() })),
  );
  const [previewing, setPreviewing] = useState<Set<string>>(new Set());
  const baseId = useId();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const updateSections = useCallback(
    (updater: (prev: Section[]) => Section[]) => {
      setSections((prev) => {
        const next = updater(prev);
        onChangeRef.current(serializeSections(next));
        return next;
      });
    },
    [],
  );

  const addSection = () => {
    updateSections((prev) => [
      ...prev,
      { id: nextId(), title: "", content: "" },
    ]);
  };

  const removeSection = (id: string) => {
    updateSections((prev) => prev.filter((s) => s.id !== id));
    setPreviewing((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const updateSection = (
    id: string,
    field: "title" | "content",
    val: string,
  ) => {
    updateSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s)),
    );
  };

  const togglePreview = (id: string) => {
    setPreviewing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {sections.length === 0 && (
        <p className="italic text-sm text-muted-foreground">
          No sections yet. Click "Add Section" to add one.
        </p>
      )}

      {sections.map((section, index) => {
        const isPreview = previewing.has(section.id);
        return (
          <div
            key={section.id}
            className="space-y-3 rounded-lg border border-border bg-background p-4"
            data-ocid={`section.panel.${index + 1}`}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label
                  htmlFor={`${baseId}-title-${section.id}`}
                  className="sr-only"
                >
                  Section Title
                </Label>
                <Input
                  id={`${baseId}-title-${section.id}`}
                  value={section.title}
                  onChange={(e) =>
                    updateSection(section.id, "title", e.target.value)
                  }
                  placeholder="e.g. Prize Pool, Rules, Schedule..."
                  className="bg-card text-sm font-semibold"
                  data-ocid={`section.input.${index + 1}`}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => togglePreview(section.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                title={isPreview ? "Edit" : "Preview"}
                data-ocid={`section.toggle.${index + 1}`}
              >
                {isPreview ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSection(section.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                title="Remove section"
                data-ocid={`section.delete_button.${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {isPreview ? (
              <div
                className="min-h-[80px] rounded-md border border-border bg-muted/30 p-3 text-sm prose-preview"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized markdown
                dangerouslySetInnerHTML={{
                  __html: section.content.trim()
                    ? renderMarkdown(section.content)
                    : "<em class='text-muted-foreground'>Nothing to preview.</em>",
                }}
              />
            ) : (
              <Textarea
                value={section.content}
                onChange={(e) =>
                  updateSection(section.id, "content", e.target.value)
                }
                placeholder="Write content here. Supports **bold**, *italic*, - lists, [links](url)..."
                rows={4}
                className="resize-none bg-card text-sm"
                data-ocid={`section.textarea.${index + 1}`}
              />
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSection}
        className="w-full gap-1 border-dashed border-border font-display text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        data-ocid="section.add_button"
      >
        <Plus className="h-3.5 w-3.5" /> Add Section
      </Button>
    </div>
  );
}
