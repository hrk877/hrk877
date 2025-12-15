"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth"
import type { User as FirebaseUser } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"

interface AuthContextType {
    user: FirebaseUser | null
    isAdmin: boolean
    isWhitelisted: boolean
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAdmin: false,
    isWhitelisted: false,
    loading: true,
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isWhitelisted, setIsWhitelisted] = useState(false)
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

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            console.log("Auth State Changed:", currentUser?.email, currentUser?.providerData)
            setUser(currentUser)

            // Admin only if logged in via Password (email/password)
            const isPasswordAuth = currentUser?.providerData?.some(p => p.providerId === 'password') ?? false
            setIsAdmin(!!currentUser && isPasswordAuth)

            if (currentUser && !currentUser.isAnonymous) {
                // Save/Update User in Firestore (Only for signed-in users)
                try {
                    const userRef = doc(db, "users", currentUser.uid)
                    await setDoc(userRef, {
                        uid: currentUser.uid,
                        email: currentUser.email || null,
                        displayName: currentUser.displayName || null,
                        photoURL: currentUser.photoURL || null,
                        lastLoginAt: serverTimestamp(),
                        isAnonymous: currentUser.isAnonymous,
                    }, { merge: true })
                } catch (error) {
                    console.error("Error updating user record:", error)
                }

                // Check whitelist status
                if (currentUser.email && !currentUser.isAnonymous) {
                    try {
                        const docRef = doc(db, "whitelisted_users", currentUser.email)
                        const docSnap = await getDoc(docRef)
                        setIsWhitelisted(docSnap.exists())
                    } catch (error) {
                        console.error("Whitelist check failed", error)
                        setIsWhitelisted(false)
                    }
                } else {
                    setIsWhitelisted(false)
                }
            } else {
                setIsWhitelisted(false)
            }

            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    return <AuthContext.Provider value={{ user, isAdmin, isWhitelisted, loading }}>{children}</AuthContext.Provider>
}
