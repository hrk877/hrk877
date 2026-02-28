"use client"

import { useState, useEffect, use, Suspense } from "react"
import { collection, query, orderBy, onSnapshot, doc, getDoc, deleteDoc } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"
import { useAuth } from "../../components/providers/AuthProvider"
import { useRouter } from "next/navigation"
import JournalDetailPage from "../../components/modals/JournalDetailPage"
import type { BlogPost } from "../../components/modals/BlogEditor"

export default function JournalPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { user, isAdmin } = useAuth()
    const router = useRouter()

    const [currentPost, setCurrentPost] = useState<BlogPost | null>(null)
    const [allPosts, setAllPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch all posts for navigation
    useEffect(() => {
        if (!db) return

        const postsRef = collection(db, "artifacts", appId, "public", "data", "posts")
        const q = query(postsRef, orderBy("createdAt", "desc"))
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedPosts: BlogPost[] = []
            querySnapshot.forEach((docSnap) => {
                fetchedPosts.push({ id: docSnap.id, ...docSnap.data() } as BlogPost)
            })
            setAllPosts(fetchedPosts)

            // Find current post in the list
            const post = fetchedPosts.find(p => p.id === id)
            if (post) {
                setCurrentPost(post)
                setLoading(false)
            } else {
                // If not found in real-time list, try direct fetch once
                fetchDirectly()
            }
        })

        const fetchDirectly = async () => {
            try {
                const docRef = doc(db, "artifacts", appId, "public", "data", "posts", id)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    setCurrentPost({ id: docSnap.id, ...docSnap.data() } as BlogPost)
                }
                setLoading(false)
            } catch (err) {
                console.error("Error fetching post:", err)
                setLoading(false)
            }
        }

        return () => unsubscribe()
    }, [id])

    const handleDeletePost = async (postId: string) => {
        if (!db) return
        try {
            await deleteDoc(doc(db, "artifacts", appId, "public", "data", "posts", postId))
            router.push("/journal")
        } catch (err) {
            console.error("Error deleting:", err)
            alert("Error deleting post.")
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAC800] flex items-center justify-center font-mono text-xs tracking-widest">
                LOADING ENTRY...
            </div>
        )
    }

    if (!currentPost) {
        return (
            <div className="min-h-screen bg-[#FAC800] flex flex-col items-center justify-center font-mono text-xs tracking-widest gap-4">
                ENTRY NOT FOUND
                <button onClick={() => router.push("/journal")} className="underline">BACK TO JOURNAL</button>
            </div>
        )
    }

    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAC800] flex items-center justify-center font-mono text-xs tracking-widest">LOADING...</div>}>
            <JournalDetailPage
                post={currentPost}
                posts={allPosts}
                onClose={() => router.push("/journal")}
                onNavigate={(post) => router.push(`/journal/${post.id}`)}
                isAdmin={isAdmin}
                onDelete={handleDeletePost}
                onEdit={(post) => {
                    router.push(`/journal?edit=${post.id}`)
                }}
            />
        </Suspense>
    )
}
