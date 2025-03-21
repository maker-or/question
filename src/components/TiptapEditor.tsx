import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlock from '@tiptap/extension-code-block';

interface TiptapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onUpdate,
  placeholder = 'Start typing...',
  editable = true,
}) => {
  // Convert markdown to HTML for initial content
  const initialContent = content
    // Convert code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Convert headings
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    // Convert bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert italics
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Convert lists
    .replace(/^\s*\*\s(.*$)/gm, '<li>$1</li>').replace(/<li>.*<\/li>/g, '<ul>$&</ul>')
    .replace(/^\s*\d+\.\s(.*$)/gm, '<li>$1</li>').replace(/<li>.*<\/li>/g, '<ol>$&</ol>')
    // Convert paragraphs (handle this last to avoid interfering with other elements)
    .replace(/^(?!<[oh][l12]>|<pre>|<h[1-6]>)(.*$)/gm, '<p>$1</p>');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Image,
      Link,
      CodeBlock,
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onUpdate(html);
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  return (
    <div className="tiptap-editor rounded-xl overflow-hidden border dark:border-gray-700 border-gray-200">
      <EditorContent editor={editor} className="prose dark:prose-invert max-w-none p-3" />
      
      {editable && (
        <div className="flex items-center gap-2 p-2 border-t dark:border-gray-700 border-gray-200 bg-gray-50 dark:bg-gray-900">
          <button 
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`p-2 rounded ${editor?.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button 
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`p-2 rounded ${editor?.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button 
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            className={`p-2 rounded ${editor?.isActive('codeBlock') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            title="Code Block"
          >
            <code>{`</>`}</code>
          </button>
          <button 
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded ${editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            title="Heading"
          >
            H2
          </button>
          <button 
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded ${editor?.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            title="Bullet List"
          >
            • List
          </button>
        </div>
      )}
    </div>
  );
};

export default TiptapEditor;
