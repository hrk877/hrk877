"use client"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence } from "framer-motion"
import { signInAnonymously, signOut } from "firebase/auth"
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from "firebase/firestore"
import { auth, db, appId } from "@/lib/firebase"
import { useAuth } from "./components/providers/AuthProvider"

// Components
import { ParallaxText } from "./components/ui/ParallaxText"
import TopNavigation from "./components/layout/TopNavigation"
import Footer from "./components/layout/Footer"

// Sections
import Hero from "./components/sections/Hero"
import Philosophy from "./components/sections/Philosophy"
import Knowledge from "./components/sections/Knowledge"
import Journal from "./components/sections/Journal"

// Modals
import LoginModal from "./components/modals/LoginModal"
import BlogEditor, { type BlogPost } from "./components/modals/BlogEditor"
import JournalDetailPage from "./components/modals/JournalDetailPage"

// ============================================
// Main App Component
// ============================================
export default function GoldenBananaApp() {
  const { user, isAdmin } = useAuth()
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  // Blog State
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [allPosts, setAllPosts] = useState<BlogPost[]>([])
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [isBlogEditorOpen, setIsBlogEditorOpen] = useState(false)

  const clickCountRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!db) return

    const postsRef = collection(db, "artifacts", appId, "public", "data", "posts")
    const q = query(postsRef, orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedPosts: BlogPost[] = []
        querySnapshot.forEach((docSnap) => {
          fetchedPosts.push({ id: docSnap.id, ...docSnap.data() } as BlogPost)
        })
        setAllPosts(fetchedPosts)
      },
      (err) => {
        console.log("Error fetching posts for navigation:", err)
      },
    )
    return () => unsubscribe()
  }, [])

  const handleSecretClick = () => {
    clickCountRef.current += 1
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (clickCountRef.current >= 5) {
      setIsLoginOpen(true)
      clickCountRef.current = 0
    } else {
      timeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0
      }, 1000)
    }
  }

  const handleLogout = async () => {
    if (!auth) return
    await signOut(auth)
    await signInAnonymously(auth)
  }

  const handleOpenPost = (post: BlogPost) => {
    setSelectedPost(post)
  }

  const handleDeletePost = async (id: string) => {
    if (!db) return
    try {
      await deleteDoc(doc(db, "artifacts", appId, "public", "data", "posts", id))
    } catch (err) {
      console.error("Error deleting:", err)
      alert("Error deleting post.")
    }
  }

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post)
    setIsBlogEditorOpen(true)
    setSelectedPost(null)
  }

  return (
    <div className="min-h-screen bg-[#FAC800] text-black selection:bg-black selection:text-[#FAC800]">
      <div className="noise-overlay" />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      <BlogEditor
        isOpen={isBlogEditorOpen}
        onClose={() => {
          setIsBlogEditorOpen(false)
          setEditingPost(null)
        }}
        user={user}
        editingPost={editingPost}
      />

      <AnimatePresence>
        {selectedPost && allPosts.length > 0 && (
          <JournalDetailPage
            post={selectedPost}
            posts={allPosts}
            onClose={() => setSelectedPost(null)}
            onNavigate={(post) => setSelectedPost(post)}
            isAdmin={isAdmin}
            onDelete={handleDeletePost}
            onEdit={handleEditPost}
          />
        )}
      </AnimatePresence>

      <main>
        <TopNavigation />
        <Hero />
        <div className="py-12 md:py-20 bg-white/80 backdrop-blur-md border-y border-black/5 relative z-10">
          <ParallaxText baseVelocity={-2}>PREMIUM BANANA EXPERIENCE — </ParallaxText>
        </div>
        <Philosophy />
        <div className="py-12 md:py-20 bg-[#FAC800] border-y border-black/5 relative z-10">
          <ParallaxText baseVelocity={2}>KNOWLEDGE — HISTORY — TRIVIA — </ParallaxText>
        </div>
        <Knowledge />
        <Journal
          isAdmin={isAdmin}
          onOpenPost={handleOpenPost}
          onNewPost={() => {
            setEditingPost(null)
            setIsBlogEditorOpen(true)
          }}
        />
        <Footer
          isAdmin={isAdmin}
          handleSecretClick={handleSecretClick}
          handleLogout={handleLogout}
        />
      </main>
    </div>
  )
}
