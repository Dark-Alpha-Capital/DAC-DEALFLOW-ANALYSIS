export interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
  height?: number;
}
