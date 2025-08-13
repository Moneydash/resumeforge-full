import '@/styles/editor.css';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react'
import Document from '@tiptap/extension-document';
import Heading from '@tiptap/extension-heading';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import TextAlign from '@tiptap/extension-text-align';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import History from '@tiptap/extension-history';
import Highlight from '@tiptap/extension-highlight';
import HardBreak from '@tiptap/extension-hard-break';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
  WrapTextIcon,
} from 'lucide-react';
import { Toggle } from './ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface editorInterface {
  value?: string;
  setValue: (event: string) => void;
}

const EditorComponent: React.FC<editorInterface> = ({ value, setValue }) => {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Strike,
      ListItem,
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc ml-3'
        }
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal ml-3'
        }
      }),
      Bold,
      Italic,
      Underline,
      HardBreak,
      Text,
      History,
      Highlight,
      Heading.configure({
        levels: [1, 2, 3]
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      setValue(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'min-h-[150px] border rounded-b-md bg-slate-50 py-2 px-3 text-black dark:bg-gray-800 dark:text-white '
      }
    }
  });

  if (!editor) {
    return null;
  }

  const options = [
    {
      icon: <Heading1Icon />,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
      pressed: editor?.isActive('heading', { level: 1 }),
      tooltip: 'Heading 1'
    },
    {
      icon: <Heading2Icon />,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      pressed: editor?.isActive('heading', { level: 2 }),
      tooltip: 'Heading 2'
    },
    {
      icon: <Heading3Icon />,
      onClick: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
      pressed: editor?.isActive('heading', { level: 3 }),
      tooltip: 'Heading 3'
    },
    {
      icon: <BoldIcon />,
      onClick: () => editor?.chain().focus().toggleBold().run(),
      pressed: editor?.isActive('bold'),
      tooltip: 'Bold'
    },
    {
      icon: <ItalicIcon />,
      onClick: () => editor?.chain().focus().toggleItalic().run(),
      pressed: editor?.isActive('italic'),
      tooltip: 'Italic'
    },
    {
      icon: <UnderlineIcon />,
      onClick: () => editor?.chain().focus().toggleUnderline().run(),
      pressed: editor?.isActive('underline'),
      tooltip: 'Underline'
    },
    {
      icon: <StrikethroughIcon />,
      onClick: () => editor?.chain().focus().toggleStrike().run(),
      pressed: editor?.isActive('strike'),
      tooltip: 'Strikethrough'
    },
    {
      icon: <ListIcon />,
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
      pressed: editor?.isActive('bulletList'),
      tooltip: 'Bullet List'
    },
    {
      icon: <ListOrderedIcon />,
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
      pressed: editor?.isActive('orderedList'),
      tooltip: 'Ordered List'
    },
    {
      icon: <AlignLeft />,
      onClick: () => editor?.chain().focus().toggleTextAlign("left").run(),
      pressed: editor?.isActive("left"),
      tooltip: 'Align Left'
    },
    {
      icon: <AlignCenter />,
      onClick: () => editor?.chain().focus().toggleTextAlign("center").run(),
      pressed: editor?.isActive("center"),
      tooltip: 'Align Center',
    },
    {
      icon: <AlignRight />,
      onClick: () => editor?.chain().focus().toggleTextAlign("right").run(),
      pressed: editor?.isActive("right"),
      tooltip: 'Align Right'
    },
    {
      icon: <AlignJustify />,
      onClick: () => editor?.chain().focus().toggleTextAlign("justify").run(),
      pressed: editor?.isActive("justify"),
      tooltip: 'Justify'
    },
    {
      icon: <Undo2Icon />,
      onClick: () => editor?.chain().focus().undo().run(),
      pressed: editor.can().undo(),
      tooltip: 'Undo'
    },
    {
      icon: <Redo2Icon />,
      onClick: () => editor?.chain().focus().redo().run(),
      pressed: editor.can().redo(),
      tooltip: 'Redo'
    },
    {
      icon: <WrapTextIcon />,
      onClick: () => editor?.chain().focus().setHardBreak().run(),
      pressed: false,
      tooltip: 'Break'
    }
  ]

  return (
    <>
      <div className="w-full border rounded-t-md p1 bg-slate-50 text-black dark:bg-gray-800 dark:text-white">
        {options.map((option, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Toggle
                key={i}
                pressed={option.pressed}
                onPressedChange={option.onClick}
              >
                {option.icon}
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              <p className="dark:text-white">{option.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div>
        <EditorContent editor={editor} />
      </div>
    </>
  )
}

export default EditorComponent;