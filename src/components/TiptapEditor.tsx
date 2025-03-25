import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlock from '@tiptap/extension-code-block';
import {

  Code,
  List,
  Italic,
  Bold, // Add Save icon
} from "lucide-react";


interface TiptapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  messageId?: string;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onUpdate,
  placeholder = 'Start typing...',
  editable = true,
  className = 'bg-red-700',
  messageId,
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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
    .replace(/^\s*\*\s(.*$)/gm, '<li>$1</li>')
    .replace(/<li>.*<\/li>/g, '<ul>$&</ul>')
    .replace(/^\s*\d+\.\s(.*$)/gm, '<li>$1</li>')
    .replace(/<li>.*<\/li>/g, '<ol>$&</ol>')
    // Convert paragraphs (skip empty/whitespace-only lines)
    .replace(/^(?!<[oh][l12]>|<pre>|<h[1-6]>)(?!\s*$)(.*\S.*)$/gm, '<p>$1</p>');

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
    onFocus: () => {
      setShowToolbar(true);
      setIsFocused(true);
    },
    onBlur: () => {
      setTimeout(() => {
        if (!document.activeElement?.closest('.editor-toolbar')) {
          setShowToolbar(false);
          setIsFocused(false);
        }
      }, 100);
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  return (
    <div className={`relative rounded-xl overflow-hidden  ${className}`}>
      <EditorContent editor={editor} className="p-4 " />
      
      {editable && showToolbar && (
        <div 
          className="editor-toolbar fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 bg-white dark:bg-[#1F1F1F]   rounded-2xl shadow-3xl"
        >
          <button 
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`p-2 h-10 w-10 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor?.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700 font-bold' : ''}`}
            title="Bold"
          >
            <Bold />
          </button>
          <button 
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`p-2 h-10 w-10 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor?.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            title="Italic"
          >
            <Italic />
          </button>
          <button 
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            className={`p-2 h-10 w-10 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor?.isActive('codeBlock') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            title="Code Block"
          >
            <Code />
          </button>
          {/* <button 
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            title="Heading"
          >
            H2
          </button>
          <button 
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor?.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            title="Bullet List"
          >
            • List
          </button> */}
        </div>
      )}
    </div>
  );
};

export default TiptapEditor;