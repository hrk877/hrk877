"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { signInAnonymously, onAuthStateChanged, signOut, signInWithCustomToken } from "firebase/auth"
import type { User as FirebaseUser } from "firebase/auth"
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from "firebase/firestore"
import { auth, db, appId } from "@/lib/firebase"

// Components
import GlobalStyles from "./components/ui/GlobalStyles"
import { ParallaxText } from "./components/ui/ParallaxText"
import TopNavigation from "./components/layout/TopNavigation"
import Footer from "./components/layout/Footer"

// Sections
import Hero from "./components/sections/Hero"
import Philosophy from "./components/sections/Philosophy"
import Knowledge from "./components/sections/Knowledge"
import Journal from "./components/sections/Journal"

// Pages
import Museum from "./components/pages/Museum"
import BananaAI from "./components/pages/BananaAI"
import Letter from "./components/pages/Letter"

// Modals
import LoginModal from "./components/modals/LoginModal"
import BlogEditor, { type BlogPost } from "./components/modals/BlogEditor"
import JournalDetailPage from "./components/modals/JournalDetailPage"

// ============================================
// Main App Component
// ============================================
export default function GoldenBananaApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState("home")
  const [targetSection, setTargetSection] = useState<string | null>(null)
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

  useEffect(() => {
    const initAuth = async () => {
      if (!auth) return

      try {
        const initialToken =
          typeof window !== "undefined"
            ? (window as unknown as { __initial_auth_token?: string }).__initial_auth_token
            : undefined

        if (initialToken) {
          await signInWithCustomToken(auth, initialToken)
        } else {
          await signInAnonymously(auth)
        }
      } catch (e) {
        console.error("Auth init failed", e)
      }
    }
    initAuth()

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setIsAdmin(!!currentUser?.email)
    })

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

  const handleNavigate = (page: string, section: string | null = null) => {
    setCurrentPage(page)
    setTargetSection(section)
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
    // Set current post to edit
    setEditingPost(post)
    // Open editor modal
    setIsBlogEditorOpen(true)
    // Close detail view (optional, but cleaner)
    setSelectedPost(null)
  }

  useEffect(() => {
    if (currentPage === "home" && targetSection) {
      const timer = setTimeout(() => {
        const element = document.getElementById(targetSection)
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
          setTargetSection(null)
        }
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [currentPage, targetSection])

  return (
    <div className="min-h-screen bg-[#FAC800] text-black selection:bg-black selection:text-[#FAC800]">
      <GlobalStyles />
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
        <AnimatePresence mode="wait">
          {currentPage === "home" && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TopNavigation onNavigate={handleNavigate} />
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
            </motion.div>
          )}

          {currentPage === "museum" && (
            <motion.div key="museum" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Museum isAdmin={isAdmin} user={user} onBack={() => handleNavigate("home")} />
            </motion.div>
          )}

          {currentPage === "ai" && (
            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <BananaAI onBack={() => handleNavigate("home")} />
            </motion.div>
          )}

          {currentPage === "letter" && (
            <motion.div key="letter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Letter onBack={() => handleNavigate("home")} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
