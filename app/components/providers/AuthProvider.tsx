"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth"
import type { User as FirebaseUser } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from "firebase/firestore"

interface AuthContextType {
    user: FirebaseUser | null
    isAdmin: boolean
    isWhitelisted: boolean
    loading: boolean
    fingerId: string | null
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAdmin: false,
    isWhitelisted: false,
    loading: true,
    fingerId: null,
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isWhitelisted, setIsWhitelisted] = useState(false)
    const [fingerId, setFingerId] = useState<string | null>(null)
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
                    const userSnap = await getDoc(userRef)
                    let currentFingerId = userSnap.data()?.fingerId

                    if (!currentFingerId) {
                        try {
                            await runTransaction(db, async (transaction) => {
                                const counterRef = doc(db, "counters", "user_count")
                                const counterSnap = await transaction.get(counterRef)
                                const newCount = (counterSnap.data()?.count || 0) + 1
                                currentFingerId = `finger${newCount}`
                                transaction.set(counterRef, { count: newCount }, { merge: true })
                                transaction.set(userRef, { fingerId: currentFingerId }, { merge: true })
                            })
                        } catch (err) {
                            console.error("Transaction failed: ", err)
                        }
                    }
                    setFingerId(currentFingerId)

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
                setFingerId(null)
            }

            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    return <AuthContext.Provider value={{ user, isAdmin, isWhitelisted, loading, fingerId }}>{children}</AuthContext.Provider>
}
