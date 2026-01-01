"use client"

import { useState, useRef } from "react"
import { signInAnonymously, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useAuth } from "./components/providers/AuthProvider"

// Components
import { ParallaxText } from "./components/ui/ParallaxText"
import HamburgerMenu from "./components/navigation/HamburgerMenu"
import Footer from "./components/layout/Footer"

// Sections
import Hero from "./components/sections/Hero"
import Philosophy from "./components/sections/Philosophy"
import Knowledge from "./components/sections/Knowledge"

// Modals
import AdminLoginModal from "./components/modals/AdminLoginModal"

// ============================================
// Main App Component
// ============================================
export default function Hrk877App() {
  const { user, isAdmin } = useAuth()
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  const clickCountRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  return (
    <div className="min-h-screen bg-[#FAC800] text-black selection:bg-black selection:text-[#FAC800]">
      <div className="noise-overlay" />
      <AdminLoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      <main>
        <HamburgerMenu />
        <Hero />
        <div className="py-12 md:py-20 bg-white/80 backdrop-blur-md border-y border-black/5 relative z-10">
          <ParallaxText baseVelocity={-2}>PREMIUM BANANA EXPERIENCE — </ParallaxText>
        </div>
        <Philosophy />
        <div className="py-12 md:py-20 bg-[#FAC800] border-y border-black/5 relative z-10">
          <ParallaxText baseVelocity={2}>KNOWLEDGE — HISTORY — TRIVIA — </ParallaxText>
        </div>
        <Knowledge />
        <Footer
          isAdmin={isAdmin}
          handleSecretClick={handleSecretClick}
          handleLogout={handleLogout}
        />
      </main>
    </div>
  )
}
