"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth"
import type { User as FirebaseUser } from "firebase/auth"
import { auth } from "@/lib/firebase"

interface AuthContextType {
    user: FirebaseUser | null
    isAdmin: boolean
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAdmin: false,
    loading: true,
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(true)

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
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    return <AuthContext.Provider value={{ user, isAdmin, loading }}>{children}</AuthContext.Provider>
}
