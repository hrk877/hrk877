"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Image from "@tiptap/extension-image"
import Dropcursor from "@tiptap/extension-dropcursor"
import { TextStyle } from "@tiptap/extension-text-style"
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Image as ImageIcon,
    Undo,
    Redo,
} from "lucide-react"
import { useCallback } from "react"

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const img = new window.Image()
            img.src = event.target?.result as string
            img.onload = () => {
                const canvas = document.createElement("canvas")
                const MAX_WIDTH = 1200
                const MAX_HEIGHT = 1200
                let width = img.width
                let height = img.height

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width
                        width = MAX_WIDTH
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height
                        height = MAX_HEIGHT
                    }
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext("2d")
                ctx?.drawImage(img, 0, 0, width, height)

                // Compress to JPEG 0.7 to significantly reduce file size for Firestore
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7)
                resolve(dataUrl)
            }
            img.onerror = reject
        }
        reader.onerror = reject
    })
}

const MenuBar = ({ editor }: { editor: any }) => {
    const addImage = useCallback(() => {
        if (!editor) return
        const input = document.createElement("input")
        input.type = "file"
        input.accept = "image/*"
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0]
                try {
                    const compressedBase64 = await compressImage(file)
                    editor.chain().focus().setImage({ src: compressedBase64 }).run()
                } catch (error) {
                    console.error("Image compression failed", error)
                }
            }
        }
        input.click()
    }, [editor])

    if (!editor) {
        return null
    }

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border border-black/10 bg-white/40 backdrop-blur-md sticky top-4 z-10 w-fit mx-auto rounded-full mb-8 px-4 py-2 shadow-sm">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`p-2 hover:bg-black/5 rounded-full transition-colors ${editor.isActive("bold") ? "bg-black text-white" : "text-black/60"}`}
                title="Bold"
            >
                <Bold size={18} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`p-2 hover:bg-black/5 rounded-full transition-colors ${editor.isActive("italic") ? "bg-black text-white" : "text-black/60"}`}
                title="Italic"
            >
                <Italic size={18} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-2 hover:bg-black/5 rounded-full transition-colors ${editor.isActive("underline") ? "bg-black text-white" : "text-black/60"}`}
                title="Underline"
            >
                <UnderlineIcon size={18} />
            </button>

            <div className="w-px h-6 bg-black/10 mx-2" />

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-2 hover:bg-black/5 rounded-full transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-black text-white" : "text-black/60"}`}
                title="H1"
            >
                <Heading1 size={18} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 hover:bg-black/5 rounded-full transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-black text-white" : "text-black/60"}`}
                title="H2"
            >
                <Heading2 size={18} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`p-2 hover:bg-black/5 rounded-full transition-colors ${editor.isActive("heading", { level: 3 }) ? "bg-black text-white" : "text-black/60"}`}
                title="H3"
            >
                <Heading3 size={18} />
            </button>

            <div className="w-px h-6 bg-black/10 mx-2" />

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 hover:bg-black/5 rounded-full transition-colors ${editor.isActive("bulletList") ? "bg-black text-white" : "text-black/60"}`}
                title="Bullet List"
            >
                <List size={18} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-2 hover:bg-black/5 rounded-full transition-colors ${editor.isActive("orderedList") ? "bg-black text-white" : "text-black/60"}`}
                title="Ordered List"
            >
                <ListOrdered size={18} />
            </button>

            <div className="w-px h-6 bg-black/10 mx-2" />

            <button
                type="button"
                onClick={addImage}
                className="p-2 hover:bg-black/5 rounded-full transition-colors text-black/60"
                title="Insert Image"
            >
                <ImageIcon size={18} />
            </button>

            <div className="w-px h-6 bg-black/10 mx-2 ml-auto" />

            <button
                type="button"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                className="p-2 hover:bg-black/5 rounded-full transition-colors disabled:opacity-20 text-black/60"
                title="Undo"
            >
                <Undo size={18} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className="p-2 hover:bg-black/5 rounded-full transition-colors disabled:opacity-20 text-black/60"
                title="Redo"
            >
                <Redo size={18} />
            </button>
        </div>
    )
}

const TipTapEditor = ({ content, onChange }: { content: string; onChange: (html: string) => void }) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                bulletList: {
                    keepAttributes: true,
                    keepMarks: true,
                },
                orderedList: {
                    keepAttributes: true,
                    keepMarks: true,
                },
                dropcursor: {
                    color: '#000000',
                    width: 2,
                },
            }),
            TextStyle,
            Underline,
            Image.configure({
                HTMLAttributes: {
                    class: "draggable-img max-w-full h-auto rounded-3xl shadow-2xl my-16 mx-auto block cursor-move",
                },
                allowBase64: true,
            }),
        ],
        content: content,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: "prose prose-base md:prose-lg max-w-none focus:outline-none min-h-[70vh] font-['Cormorant_Garamond',_serif] leading-relaxed px-4 md:px-0 selection:bg-black selection:text-[#FAC800] break-words whitespace-pre-wrap",
            },
            handleDrop: (view, event, slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                    const file = event.dataTransfer.files[0]
                    if (file.type.startsWith("image/")) {
                        compressImage(file).then(base64 => {
                            const { schema } = view.state
                            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
                            const node = schema.nodes.image.create({ src: base64 })
                            const transaction = view.state.tr.insert(coordinates?.pos || 0, node)
                            view.dispatch(transaction)
                        })
                        return true
                    }
                }
                return false
            },
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || [])
                const imageItem = items.find(item => item.type.startsWith("image/"))

                if (imageItem) {
                    const file = imageItem.getAsFile()
                    if (file) {
                        compressImage(file).then(base64 => {
                            const { schema } = view.state
                            const node = schema.nodes.image.create({ src: base64 })
                            const transaction = view.state.tr.replaceSelectionWith(node)
                            view.dispatch(transaction)
                        })
                        return true
                    }
                }
                return false
            },
            transformPastedHTML(html) {
                // Remove all inline styles to force our default font
                return html.replace(/ style="[^"]*"/gi, "")
            },
            transformPastedText(text) {
                return text
            }
        },
    })

    return (
        <div className="min-h-full">
            <MenuBar editor={editor} />
            <div className="max-w-3xl mx-auto">
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}

export default TipTapEditor
