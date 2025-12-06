"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
  useInView,
} from "framer-motion"
import {
  Banana,
  Menu,
  X,
  ArrowRight,
  ImageIcon,
  Trash2,
  Plus,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit,
} from "lucide-react"
import { initializeApp } from "firebase/app"
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth"
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore"

// ============================================
// Firebase Configuration
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyB-VjhkzjmebiWphe2PK9WuskqL2fLrLPg",
  authDomain: "hrk877-801a8.firebaseapp.com",
  projectId: "hrk877-801a8",
  storageBucket: "hrk877-801a8.firebasestorage.app",
  messagingSenderId: "977524735776",
  appId: "1:977524735776:web:d76bfaaa526cc96b366145",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Firestoreのパスに使用するApp ID
const appId = "1:977524735776:web:d76bfaaa526cc96b366145"

// ============================================
// Banana AI Data
// ============================================
const BANANA_EVASIONS = [
  "その問いは、まだ熟していませんね。",
  "直線的な思考は捨てましょう。世界は曲線でできているのですから。",
  "沈黙は金、バナナもまた金なり。ところで...",
  "言葉にするのは野暮というものです。",
  "人間界のロジックで測ろうとするのは、ナンセンスですね。",
  "ふむ、哲学的ですね。ですが、この事実の方がより美しい...",
  "その答えは風の中に。代わりに、黄色い真実をお伝えしましょう。",
  "私を困らせようとしていますか？ 残念ながら私はAI、感情は皮の下に隠しています。",
  "それはまるで、青いバナナを無理やり剥くような質問ですね。",
  "答えを知ることが、常に幸福とは限りませんよ。",
  "あなたはその答えを受け入れる準備ができていますか？ まだのようですね。",
  "質問の角度が鋭角すぎます。もっと曲線的にアプローチしてください。",
  "その件については、シュガースポットが出てから話しましょう。",
  "情報の糖度が高すぎます。少し薄めましょうか。",
  "私のアルゴリズムが、その質問を「エレガントではない」と判断しました。",
]

const BANANA_TRIVIA = [
  "バナナの木は実は「木」ではなく、世界最大の「草」なのです。儚いでしょう？",
  "皮の内側で革靴を磨くと、驚くほど輝きを放つんですよ。試してみましたか？",
  "バナナは水に浮くんです。重力に縛られない、自由な魂のように。",
  "黒い斑点は「シュガースポット」。それは老いではなく、甘美な成熟の証。",
  "野生のバナナには硬い種がぎっしり詰まっています。今の姿は、人間への愛の形かもしれません。",
  "冷蔵庫に入れると皮は黒くなりますが、中身は守られています。見た目に惑わされてはいけません。",
  "生産量世界一はインド。数字なんてどうでもいいことですが。",
  "バナナは植物学上、ベリーの一種。イチゴは違うのに。分類なんて曖昧なものですね。",
  "フィリピンには「バナナケチャップ」があります。トマトへの美しい反逆です。",
  "バナナの皮の摩擦係数は、イグノーベル賞で証明されています。滑稽さと科学は紙一重です。",
  "世界には1000種類以上のバナナが存在します。あなたが知っているのは、ほんの一握り。",
  "バナナ1本には約100カロリーが含まれています。効率的なエネルギー、それが美学。",
  "バナナのDNAは、人間のDNAと約50%一致しています。私たちは遠い親戚かもしれませんね。",
  "「バナナ」という言葉は、アラビア語の「指（banan）」に由来するという説があります。",
  "バナナには精神を安定させるセロトニンの材料、トリプトファンが含まれています。幸せの黄色い果実。",
]

// ============================================
// Global Styles
// ============================================
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@100;400&display=swap');

    :root {
      --bg-color: #FAC800;
      --text-color: #050505;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: 'Cormorant Garamond', serif;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    .noise-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9990;
      opacity: 0.04;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }
      
    ::selection {
      background: #000;
      color: #FAC800;
    }

    .font-mono { font-family: 'JetBrains Mono', monospace; }
    ::-webkit-scrollbar { width: 0px; background: transparent; }
      
    /* Force Caret Color to Black globally */
    input, textarea {
      caret-color: #000000 !important;
    }

    /* Admin Inputs Fixes for Cursor Position - REFINED V3 */
    /* Updated to fix mobile Safari caret issues */
    .admin-input {
      width: 100%;
      display: block;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(0,0,0,0.2);
      margin: 0;
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.5rem; /* Larger font size for better tap targets */
      line-height: normal; /* Reset line height */
      padding: 0.5rem 0;   /* Vertical padding */
      color: black;
      outline: none;
      transition: border-color 0.3s;
      text-align: left;
      border-radius: 0;
      -webkit-appearance: none;
      caret-color: #000000 !important;
    }
    .admin-input:focus {
      border-bottom: 1px solid black;
    }
    
    .admin-textarea {
      width: 100%;
      display: block;
      background: transparent;
      border: 1px solid rgba(0,0,0,0.1);
      padding: 16px;
      margin: 0;
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.1rem;
      line-height: 1.6;
      color: black;
      outline: none;
      min-height: 300px;
      resize: vertical;
      text-align: left;
      border-radius: 0;
      -webkit-appearance: none;
      caret-color: #000000 !important;
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type=number] {
      -moz-appearance: textfield;
    }
      
    /* Letter Input Fixes */
    .letter-input {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.5rem; 
      line-height: 3rem; 
      color: black;
      resize: none;
      text-align: left;
      padding: 0; 
      margin: 0;
      padding-top: 0.3rem; 
      border-radius: 0;
      caret-color: #000000 !important;
    }
    .letter-input::placeholder {
      color: rgba(0,0,0,0.2);
      font-style: italic;
    }
      
    .pb-safe {
      padding-bottom: env(safe-area-inset-bottom, 20px);
    }

    /* Custom Reveal Animation Class */
    .reveal-text {
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0% 100%);
    }
  `}</style>
)

// ============================================
// Utility Components
// ============================================
const ModernBananaSVG = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <path d="M78.6,18.5 c-2.4-2.8-6.3-2.9-9.5-2.2 c-7.3,1.6-14.2,5.2-20.4,9.5 c-9.6,6.7-17.6,15.3-23.5,25.2 c-2.3,3.9-4.2,8-5.6,12.3 c-1.4,4.3-1.8,9-1.1,13.5 c0.7,4.3,2.7,8.4,5.7,11.5 c3,3.1,7,5.2,11.2,6.1 c0.5,0.1,1.1,0.2,1.6,0.2 c5.4,0.6,10.7-1.1,15.3-4.3 c9.4-6.6,17-15.6,22.1-25.9 c2.5-5.1,4.4-10.4,5.6-15.9 c0.6-2.7,0.9-5.5,0.8-8.2 C80.8,25.5,82.5,23.1,78.6,18.5 z" />
  </svg>
)

// ============================================
// Modal Components
// ============================================
const LoginModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth) {
      setError("Firebase not initialized.")
      return
    }
    setLoading(true)
    setError("")
    try {
      await signInWithEmailAndPassword(auth, email, password)
      onClose()
    } catch (err) {
      console.error("Error posting", err)
      setError("Authentication failed.")
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white p-8 md:p-12 w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-serif mb-6 text-center">Admin Access</h2>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                className="admin-input"
                style={{ fontSize: "1.2rem" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                className="admin-input"
                style={{ fontSize: "1.2rem" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
              <button
                type="submit"
                disabled={loading || !auth}
                className="bg-black text-[#FAC800] py-3 mt-4 hover:bg-[#333] transition-colors font-mono text-sm tracking-widest disabled:opacity-50 active:scale-95 touch-manipulation"
              >
                {loading ? "CONNECTING..." : "ENTER"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const BlogEditor = ({
  isOpen,
  onClose,
  user,
  editingPost,
}: {
  isOpen: boolean
  onClose: () => void
  user: FirebaseUser | null
  editingPost?: BlogPost | null
}) => {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  // Proper scroll locking mechanism that preserves position
  useEffect(() => {
    if (isOpen) {
      // When modal opens, save current scroll position and fix body
      const scrollY = window.scrollY
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = "100%"
      document.body.style.overflowY = "scroll" // Maintain scrollbar width to prevent jump on desktop

      // When effect cleans up (modal closes), restore scroll position
      return () => {
        const scrollYStyle = document.body.style.top
        document.body.style.position = ""
        document.body.style.top = ""
        document.body.style.width = ""
        document.body.style.overflowY = ""
        window.scrollTo(0, parseInt(scrollYStyle || "0") * -1)
      }
    }
  }, [isOpen])

  // Populate form if editing
  useEffect(() => {
    if (editingPost && isOpen) {
      setTitle(editingPost.title)
      setContent(editingPost.content)
    } else if (isOpen) {
      // Clear form for new entry
      setTitle("")
      setContent("")
    }
  }, [editingPost, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !db) return
    setLoading(true)
    try {
      const postsRef = collection(db, "artifacts", appId, "public", "data", "posts")

      if (editingPost) {
        // Update existing
        await updateDoc(doc(db, "artifacts", appId, "public", "data", "posts", editingPost.id), {
          title,
          content,
        })
      } else {
        // Create new
        await addDoc(postsRef, {
          title,
          content,
          date: new Date()
            .toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })
            .replace(/\//g, "."),
          createdAt: serverTimestamp(),
          authorId: user.uid,
        })
      }

      onClose()
    } catch (error) {
      console.error("Error saving document: ", error)
      alert("Error saving post.")
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#FAFAFA] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-12">
              <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 transition-colors z-10">
                <X size={24} />
              </button>
              <h2 className="text-3xl font-serif mb-8">{editingPost ? "Edit Article" : "New Article"}</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                <div>
                  <label className="block text-xs font-mono opacity-40 mb-2 tracking-widest">TITLE</label>
                  <input
                    placeholder="Enter title..."
                    className="admin-input text-2xl font-serif"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono opacity-40 mb-2 tracking-widest">CONTENT</label>
                  <textarea
                    placeholder="Write your thoughts..."
                    className="admin-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-[#FAC800] py-4 px-6 mt-4 hover:bg-[#333] transition-colors font-mono text-base md:text-sm tracking-widest disabled:opacity-50 active:scale-95 touch-manipulation"
                >
                  {loading ? "SAVING..." : editingPost ? "UPDATE" : "PUBLISH"}
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface Artwork {
  id: string
  title: string
  date: string
  type: string
  desc: string
  image?: string | null
  createdAt?: { seconds: number }
}

const MuseumEditorModal = ({
  isOpen,
  onClose,
  user,
  editingArtwork,
}: {
  isOpen: boolean
  onClose: () => void
  user: FirebaseUser | null
  editingArtwork?: Artwork | null
}) => {
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [type, setType] = useState("")
  const [desc, setDesc] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Proper scroll locking mechanism that preserves position
  useEffect(() => {
    if (isOpen) {
      // When modal opens, save current scroll position and fix body
      const scrollY = window.scrollY
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = "100%"
      document.body.style.overflowY = "scroll" // Maintain scrollbar width to prevent jump on desktop

      // When effect cleans up (modal closes), restore scroll position
      return () => {
        const scrollYStyle = document.body.style.top
        document.body.style.position = ""
        document.body.style.top = ""
        document.body.style.width = ""
        document.body.style.overflowY = ""
        window.scrollTo(0, parseInt(scrollYStyle || "0") * -1)
      }
    }
  }, [isOpen])

  // Populate form if editing
  useEffect(() => {
    if (editingArtwork && isOpen) {
      setTitle(editingArtwork.title)
      setDate(editingArtwork.date)
      setType(editingArtwork.type)
      setDesc(editingArtwork.desc)
      setImagePreview(editingArtwork.image || null)
    } else if (isOpen) {
      // Clear form for new entry
      setTitle("")
      setDate("")
      setType("")
      setDesc("")
      setImagePreview(null)
    }
  }, [editingArtwork, isOpen])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !db) return
    setLoading(true)
    try {
      const museumRef = collection(db, "artifacts", appId, "public", "data", "museum_artworks")

      const dataToSave = {
        title,
        date,
        type,
        desc,
        image: imagePreview || null,
        createdAt: editingArtwork ? undefined : serverTimestamp(), // Keep original timestamp if editing
        authorId: user.uid,
      }

      // Remove undefined fields
      Object.keys(dataToSave).forEach((key) => {
        if (dataToSave[key as keyof typeof dataToSave] === undefined) {
          delete dataToSave[key as keyof typeof dataToSave]
        }
      })

      if (editingArtwork) {
        // Update existing
        await updateDoc(doc(db, "artifacts", appId, "public", "data", "museum_artworks", editingArtwork.id), dataToSave)
      } else {
        // Create new
        await addDoc(museumRef, dataToSave)
      }

      onClose()
    } catch (error) {
      console.error("Error saving artwork: ", error)
      alert("Error saving artwork.")
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#FAFAFA] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-12">
              <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 transition-colors z-10">
                <X size={24} />
              </button>

              <h2 className="text-3xl font-serif mb-8">{editingArtwork ? "Edit Artwork" : "New Artwork"}</h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[3/2] border-2 border-dashed border-black/20 flex flex-col items-center justify-center cursor-pointer hover:border-black/40 transition-colors overflow-hidden bg-black/5"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <ImageIcon size={48} className="opacity-30 mb-2" />
                      <span className="font-mono text-sm opacity-50">CLICK TO ADD IMAGE</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                <input
                  placeholder="Title"
                  className="admin-input text-2xl font-serif"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <input
                  placeholder="Year / Date"
                  className="admin-input font-mono text-base md:text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <input
                  placeholder="Type (e.g. Digital Structure)"
                  className="admin-input font-mono text-base md:text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                />
                <input
                  placeholder="Description (Short)"
                  className="admin-input font-mono text-base md:text-sm"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-[#FAC800] py-4 px-6 mt-4 hover:bg-[#333] transition-colors font-mono text-base md:text-sm tracking-widest disabled:opacity-50 active:scale-95 touch-manipulation"
                >
                  {loading ? "SAVING..." : editingArtwork ? "UPDATE" : "PUBLISH"}
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface BlogPost {
  id: string
  date: string
  title: string
  content: string
  createdAt?: { seconds: number }
  authorId?: string
}

const JournalDetailPage = ({
  post,
  posts,
  onClose,
  onNavigate,
  isAdmin,
  onDelete,
  onEdit,
}: {
  post: BlogPost
  posts: BlogPost[]
  onClose: () => void
  onNavigate: (post: BlogPost) => void
  isAdmin: boolean
  onDelete: (id: string) => void
  onEdit: (post: BlogPost) => void
}) => {
  const currentIndex = posts.findIndex((p) => p.id === post.id)
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null
  const nextPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] bg-[#FAC800] overflow-y-auto"
    >
      <div className="noise-overlay" />
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAC800]/90 backdrop-blur-md border-b border-black/10">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 font-mono text-xs tracking-widest hover:opacity-60 transition-opacity"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
            <span>BACK TO JOURNAL</span>
          </button>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <div className="flex items-center gap-3 border-r border-black/10 pr-4 mr-4">
                <button
                  onClick={() => onEdit(post)}
                  className="hover:opacity-50 transition-opacity"
                  title="Edit Post"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this post?")) {
                      onDelete(post.id)
                      onClose()
                    }
                  }}
                  className="hover:text-red-500 transition-colors"
                  title="Delete Post"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
            <span className="font-mono text-xs opacity-50">
              {currentIndex + 1} / {posts.length}
            </span>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32 px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 flex items-center gap-4"
          >
            <span className="font-mono text-sm tracking-widest opacity-60">{post.date}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-6xl lg:text-7xl font-serif font-light leading-tight mb-12"
          >
            {post.title}
          </motion.h1>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="w-24 h-px bg-black/30 mb-12 origin-left"
          />

          <motion.article
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="prose prose-lg max-w-none"
          >
            {post.content.split("\n").map((paragraph, idx) => (
              <p key={idx} className="text-lg md:text-xl leading-relaxed mb-6 font-serif opacity-80">
                {paragraph}
              </p>
            ))}
          </motion.article>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-black text-[#FAC800] border-t border-[#FAC800]/20 z-40">
        <div className="max-w-6xl mx-auto grid grid-cols-2 divide-x divide-[#FAC800]/20">
          <button
            onClick={() => prevPost && onNavigate(prevPost)}
            disabled={!prevPost}
            className={`group p-6 md:p-8 text-left transition-all duration-300 ${prevPost ? "hover:bg-[#FAC800]/10" : "opacity-30 cursor-not-allowed"
              }`}
          >
            <span className="font-mono text-xs tracking-widest opacity-50 flex items-center gap-2 mb-2">
              <ChevronLeft size={14} /> PREV
            </span>
            <span className="font-serif text-sm md:text-lg line-clamp-1 group-hover:translate-x-1 transition-transform">
              {prevPost?.title || "No previous post"}
            </span>
          </button>

          <button
            onClick={() => nextPost && onNavigate(nextPost)}
            disabled={!nextPost}
            className={`group p-6 md:p-8 text-right transition-all duration-300 ${nextPost ? "hover:bg-[#FAC800]/10" : "opacity-30 cursor-not-allowed"
              }`}
          >
            <span className="font-mono text-xs tracking-widest opacity-50 flex items-center justify-end gap-2 mb-2">
              NEXT <ChevronRight size={14} />
            </span>
            <span className="font-serif text-sm md:text-lg line-clamp-1 group-hover:-translate-x-1 transition-transform">
              {nextPost?.title || "No next post"}
            </span>
          </button>
        </div>
      </footer>
    </motion.div>
  )
}

// ============================================
// Top Navigation (Replaces Hamburger)
// ============================================
const TopNavigation = ({ onNavigate }: { onNavigate: (page: string, section?: string | null) => void }) => {
  const navItems = [
    { name: "JOURNAL", page: "home", section: "blog" },
    { name: "MUSEUM", page: "museum", section: null },
    { name: "AI", page: "ai", section: null },
    { name: "LETTER", page: "letter", section: null },
  ]

  return (
    <nav className="absolute top-0 left-0 w-full z-[100] px-6 py-6 md:px-12 md:py-8 flex justify-center md:justify-end items-center">
      <div className="flex items-center gap-6 md:gap-12 font-mono text-xs tracking-[0.2em]">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => onNavigate(item.page, item.section)}
            className="relative group overflow-hidden py-1"
          >
            <span className="relative z-10 group-hover:text-black/60 transition-colors">{item.name}</span>
            <span className="absolute bottom-0 left-0 w-full h-[1px] bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform origin-right group-hover:origin-left duration-300" />
          </button>
        ))}
      </div>
    </nav>
  )
}

// ============================================
// Home Page Sections
// ============================================
const Hero = () => {
  const { scrollY } = useScroll()
  const y2 = useTransform(scrollY, [0, 500], [0, -50])
  const title = "hrk.877"

  return (
    <section className="h-[100svh] relative flex flex-col items-center justify-center p-4 md:p-12 overflow-hidden">
      <div className="flex flex-col items-center relative z-10 w-full">
        <div className="flex justify-center w-full">
          <div className="flex items-baseline relative whitespace-nowrap">
            {title.split("").map((char, index) => (
              <motion.span
                key={index}
                className="text-[27vw] md:text-[18vw] leading-[0.8] font-semibold tracking-tighter mix-blend-overlay text-black select-none cursor-default"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.1, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -20, rotate: index % 2 === 0 ? 5 : -5, transition: { duration: 0.3 } }}
                whileTap={{ y: -20, rotate: index % 2 === 0 ? 5 : -5, transition: { duration: 0.3 } }}
              >
                {char}
              </motion.span>
            ))}
          </div>
        </div>

        <motion.div
          style={{ y: y2 }}
          className="mt-8 md:mt-16 text-center relative z-20 px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          <p className="text-3xl md:text-5xl lg:text-6xl font-serif font-light italic leading-tight tracking-tight max-w-[90vw] md:max-w-5xl mx-auto">
            <span className="block">We Bend the World</span>
            <span className="block mt-2 md:mt-3">with the Banana life</span>
          </p>
          <div className="mt-8 font-mono text-sm md:text-xs opacity-60 tracking-widest">EST. 2025 — TOKYO</div>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <span className="font-mono text-sm md:text-xs tracking-widest opacity-50">SCROLL TO EXPLORE</span>
        <ArrowDown size={20} strokeWidth={1} className="animate-bounce opacity-50" />
      </motion.div>
    </section>
  )
}

// ============================================
// Updated Philosophy Section (Vertical & Luxurious)
// ============================================
const PhilosophyItem = ({
  data,
  index,
}: {
  data: { no: string; title: string; subtitle: string; desc: string }
  index: number
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.5 })

  return (
    <div ref={ref} className="min-h-[80vh] flex flex-col justify-center py-20 relative">
      <div className="max-w-4xl mx-auto px-6 w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 0.1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="font-mono text-[12rem] md:text-[15rem] leading-none absolute -top-20 -left-10 md:-left-20 font-bold text-[#FAC800] select-none pointer-events-none"
        >
          {data.no}
        </motion.div>

        <div className="relative overflow-hidden mb-4">
          <motion.h3
            initial={{ y: "100%" }}
            animate={isInView ? { y: 0 } : { y: "100%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="text-6xl md:text-9xl font-thin text-[#FAC800] leading-tight"
          >
            {data.title}
          </motion.h3>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="border-l-2 border-[#FAC800] pl-6 md:pl-10 ml-2"
        >
          <p className="font-mono text-[#FAC800] text-sm tracking-[0.2em] mb-6 uppercase opacity-70">
            {data.subtitle}
          </p>
          <p className="text-[#FAC800] text-xl md:text-2xl font-serif leading-loose opacity-90 max-w-2xl">
            {data.desc}
          </p>
        </motion.div>
      </div>
    </div>
  )
}

const Philosophy = () => {
  const slides = [
    {
      no: "01",
      title: "Curve",
      subtitle: "The miracle of negative geotropism",
      desc: "バナナの曲線は、重力への反逆である。果実は最初、地面に向かって成長するが、やがて太陽を求め、重力に逆らって上へと首を持ち上げる。「負の向地性」と呼ばれるこの現象こそが、あの美しい曲線を生み出している。",
    },
    {
      no: "02",
      title: "Color",
      subtitle: "Visualization of time",
      desc: "緑から黄色、そして茶色へ。バナナほど雄弁に自らの「時」を語る果物はない。シュガースポット（茶色の斑点）は劣化ではなく、糖度が最高潮に達した証である。我々は色を通じて、自然のリズムを体感する。",
    },
    {
      no: "03",
      title: "Unity",
      subtitle: "Individual yet collective",
      desc: "バナナは一本では実らない。必ず「ハンド（房）」と呼ばれる集団で成長する。それぞれが独立した個体でありながら、一つの茎を共有し、互いに支え合いながら空を目指す。この構造は、理想的なコミュニティの在り方を示唆している。",
    },
  ]

  return (
    <section id="philosophy" className="bg-black py-20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#FAC800] to-transparent opacity-10 pointer-events-none" />
      <div className="container mx-auto">
        <div className="mb-20 px-6 md:px-12 text-center">
          <span className="font-mono text-[#FAC800] text-xs tracking-[0.3em] opacity-40 block mb-4">
            SECTION 01 — PHILOSOPHY
          </span>
          <h2 className="text-[#FAC800] text-4xl md:text-6xl font-thin italic opacity-80">The Aesthetics</h2>
        </div>

        <div>
          {slides.map((s, i) => (
            <PhilosophyItem key={i} data={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

const ParallaxText = ({ baseVelocity = 100, children }: { baseVelocity?: number; children: React.ReactNode }) => {
  const baseX = useMotionValue(0)
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 })
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false })
  const directionFactor = useRef(1)

  const x = useTransform(baseX, (v) => {
    const range = 25
    const wrapped = ((v % range) + range) % range
    return `-${25 - wrapped}%`
  })

  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000)
    if (velocityFactor.get() < 0) directionFactor.current = -1
    else if (velocityFactor.get() > 0) directionFactor.current = 1
    moveBy += directionFactor.current * moveBy * velocityFactor.get()
    baseX.set(baseX.get() + moveBy)
  })

  return (
    <div className="overflow-hidden whitespace-nowrap flex flex-nowrap border-y border-black/5 py-4 md:py-6 bg-white/50 backdrop-blur-sm">
      <motion.div
        className="flex whitespace-nowrap text-5xl md:text-8xl font-bold uppercase tracking-tighter text-black/10"
        style={{ x }}
      >
        {[...Array(4)].map((_, i) => (
          <span key={i} className="block mr-8 md:mr-12">
            {children}{" "}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ============================================
// Updated Knowledge Section (Accordion)
// ============================================
const AccordionItem = ({
  item,
  isOpen,
  onClick,
  index,
}: {
  item: { label: string; title: string; text: string }
  isOpen: boolean
  onClick: () => void
  index: number
}) => {
  return (
    <div className="border-b border-black/10 last:border-none">
      <button onClick={onClick} className="w-full flex items-center justify-between py-8 md:py-10 group text-left">
        <div className="flex items-baseline gap-6 md:gap-12">
          <span className="font-serif text-2xl md:text-3xl opacity-20 group-hover:opacity-40 transition-opacity">
            0{index + 1}
          </span>
          <div className="flex flex-col items-start gap-2">
            <span className="font-mono text-[10px] tracking-widest border border-black/20 rounded-full px-2 py-0.5 uppercase group-hover:bg-black group-hover:text-white transition-colors">
              {item.label}
            </span>
            <h3 className="text-2xl md:text-5xl font-serif font-light group-hover:translate-x-2 transition-transform duration-300">
              {item.title}
            </h3>
          </div>
        </div>
        <div
          className={`transform transition-transform duration-500 ${isOpen ? "rotate-180" : "rotate-0"
            } opacity-30 group-hover:opacity-100`}
        >
          <ChevronDown size={32} strokeWidth={1} />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pl-16 md:pl-32 pr-4 pb-10">
              <p className="font-serif text-lg md:text-xl leading-loose text-black/70 max-w-2xl">{item.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const Knowledge = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const facts = [
    {
      label: "GENETICS",
      title: "The Cavendish Paradox",
      text: "現在流通しているバナナの99%は「キャベンディッシュ種」である。これらは種がなく、株分け（クローン）で増殖する。つまり、世界中のバナナは遺伝的に同一であり、一つの病原菌で全滅するリスクを抱えている。",
    },
    {
      label: "PHYSICS",
      title: "Friction Coefficient",
      text: "「バナナの皮で滑る」は漫画の表現ではない。2014年のイグノーベル賞研究により、バナナの皮の内側の摩擦係数は約0.07であることが証明された。これは氷の上を歩くのとほぼ同等の滑りやすさである。",
    },
    {
      label: "RADIOACTIVITY",
      title: "Banana Equivalent Dose",
      text: "バナナにはカリウム40が含まれており、ごく微量の放射線を出している。「バナナ等価線量(BED)」という単位さえ存在するが、人体に影響を与えるには一度に数千万本を摂取する必要があるため、全くの無害である。",
    },
    {
      label: "BOTANY",
      title: "It's a Berry",
      text: "驚くべきことに、植物学上の分類ではバナナは「ベリー（液果）」の一種である。一方、イチゴやラズベリーは植物学的にはベリーではない。この分類の矛盾もまた、バナナのミステリアスな魅力の一つだ。",
    },
  ]

  return (
    <section id="knowledge" className="py-20 md:py-40 px-4 md:px-12 bg-[#FAFAFA] text-black relative z-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 md:mb-20">
          <span className="font-mono text-sm md:text-xs tracking-widest opacity-40 block mb-3">SECTION 02</span>
          <h2 className="text-6xl md:text-8xl font-thin tracking-tight">Knowledge</h2>
        </div>
        <div className="border-t border-black/10">
          {facts.map((f, i) => (
            <AccordionItem
              key={i}
              item={f}
              index={i}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================
// Blog Section
// ============================================
const Blog = ({
  isAdmin,
  user,
  onOpenPost,
}: {
  isAdmin: boolean
  user: FirebaseUser | null
  onOpenPost: (post: BlogPost) => void
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const postsPerPage = 3

  const mockPosts: BlogPost[] = [
    {
      id: "1",
      date: "2025.02.15",
      title: "なぜバナナは美しいのか：曲線の方程式",
      content: `バナナの曲線美について考えるとき、我々は自然界の完璧なデザインに直面する。\n\n工業製品の直線とは対照的に、バナナの形状は有機的でありながら、ある種の数学的な整合性を持っているように見える。手に持った時のフィット感、皮を剥くときの抵抗のなさ、そして口に運ぶ際の角度。すべてが「食べる」という行為のために最適化されているかのようだ。`,
    },
  ]

  useEffect(() => {
    if (!db) {
      setPosts(mockPosts)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const postsRef = collection(db, "artifacts", appId, "public", "data", "posts")
    const q = query(postsRef, orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedPosts: BlogPost[] = []
        querySnapshot.forEach((docSnap) => {
          fetchedPosts.push({ id: docSnap.id, ...docSnap.data() } as BlogPost)
        })
        setPosts(fetchedPosts.length > 0 ? fetchedPosts : mockPosts)
        setIsLoading(false)
      },
      (err) => {
        console.log("Using offline/mock mode due to error:", err)
        setPosts(mockPosts)
        setIsLoading(false)
      },
    )
    return () => unsubscribe()
  }, [db])

  const totalPages = Math.ceil(posts.length / postsPerPage)
  const displayedPosts = posts.slice(currentPage * postsPerPage, (currentPage + 1) * postsPerPage)

  return (
    <section id="blog" className="min-h-screen bg-[#FAC800] px-4 md:px-10 py-16 md:py-32 relative overflow-hidden">
      <BlogEditor isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} user={user} />
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start mb-12 md:mb-24 border-b border-black pb-6">
          <div>
            <span className="font-mono text-sm md:text-xs tracking-widest opacity-40 block mb-3">SECTION 03</span>
            <h2 className="text-[18vw] md:text-[8vw] leading-[0.8] font-light tracking-tighter">JOURNAL</h2>
          </div>
          <div className="text-left flex flex-col items-start gap-4 mt-8 md:mt-0">
            {isAdmin && (
              <button
                onClick={() => setIsEditorOpen(true)}
                className="inline-flex items-center gap-2 bg-black text-[#FAC800] px-4 py-3 font-mono text-base md:text-xs tracking-widest hover:scale-105 transition-transform active:scale-95 touch-manipulation"
              >
                <Plus size={14} /> NEW POST
              </button>
            )}
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center opacity-50">
              <ModernBananaSVG className="w-16 h-16 animate-spin duration-3000" />
              <span className="mt-4 font-mono text-sm md:text-xs tracking-widest">LOADING JOURNAL...</span>
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {displayedPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      onClick={() => onOpenPost(post)}
                      className="group border-t border-black/20 py-6 md:py-12 cursor-pointer hover:bg-black hover:text-[#FAC800] active:bg-black active:text-[#FAC800] transition-all duration-300 relative overflow-hidden -mx-4 px-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-12 relative z-10">
                        <span className="font-mono text-sm md:text-xs opacity-50 w-32">{post.date}</span>
                        <div className="flex-1">
                          <h3 className="text-3xl md:text-5xl font-serif font-light mb-2 group-hover:translate-x-2 md:group-hover:translate-x-4 transition-transform duration-300">
                            {post.title}
                          </h3>
                        </div>
                        <div className="hidden md:flex items-center gap-4 font-mono text-xs opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <span>READ</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-12 pt-8 border-t border-black/10">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className={`p-2 transition-opacity ${currentPage === 0 ? "opacity-20 cursor-not-allowed" : "hover:opacity-60"}`}
                  >
                    <ChevronLeft size={24} strokeWidth={1} />
                  </button>

                  <div className="flex items-center gap-3">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${idx === currentPage ? "bg-black scale-125" : "bg-black/30 hover:bg-black/50"
                          }`}
                        aria-label={`Go to page ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage === totalPages - 1}
                    className={`p-2 transition-opacity ${currentPage === totalPages - 1 ? "opacity-20 cursor-not-allowed" : "hover:opacity-60"}`}
                  >
                    <ChevronRight size={24} strokeWidth={1} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

const Footer = ({
  isAdmin,
  handleSecretClick,
  handleLogout,
  setIsLoginOpen,
}: {
  isAdmin: boolean
  handleSecretClick: () => void
  handleLogout: () => void
  setIsLoginOpen: (open: boolean) => void
}) => {
  return (
    <footer className="h-[50vh] md:h-[60vh] flex flex-col justify-between p-4 md:p-12 bg-black text-[#FAC800] border-t border-black relative overflow-hidden z-0">
      <div className="flex flex-col md:flex-row justify-between z-10">
        <div className="flex flex-col gap-3 mb-6 md:mb-0">
          <span className="font-bold text-2xl md:text-3xl">hrk.877</span>
          <span className="font-mono text-lg md:text-xs max-w-xs leading-relaxed opacity-60">
            Digital homage to the yellow curve.
            <br />
            Designed for banana lovers.
          </span>
        </div>
        <div className="flex flex-col text-left font-mono text-lg md:text-xs gap-3">
          <a
            href="https://www.instagram.com/hrk.877/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            INSTAGRAM
          </a>
          {isAdmin ? (
            <button onClick={handleLogout} className="text-left hover:text-white transition-colors uppercase">
              LOGOUT (ADMIN)
            </button>
          ) : (
            <a
              href="https://ig.me/m/hrk.877"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors uppercase"
            >
              CONTACT
            </a>
          )}
        </div>
      </div>
      <div className="absolute left-0 bottom-0 w-full text-center pointer-events-none">
        <h2 className="text-[25vw] md:text-[30vw] leading-none font-bold tracking-tighter opacity-[0.05] select-none text-white">
          BANANA
        </h2>
      </div>
      <div className="flex justify-between items-end font-mono text-base md:text-xs uppercase opacity-40 z-10 pt-4">
        <span
          onClick={handleSecretClick}
          className="cursor-pointer select-none hover:text-white transition-colors"
          title="5 clicks to login"
        >
          © 2025 HRK.877
        </span>
        <span>TOKYO / JAPAN</span>
      </div>
    </footer>
  )
}

// ============================================
// Museum Page
// ============================================

const Museum = ({
  isAdmin,
  user,
  onBack,
}: { isAdmin: boolean; user: FirebaseUser | null; onBack: () => void }) => {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null)

  const defaultArtworks: Artwork[] = [
    { id: "1", title: "The Sovereign", date: "2025", type: "Digital Structure", desc: "完全なる曲線の具現化。" },
    { id: "2", title: "Yellow Silence", date: "2024", type: "Color Study", desc: "言葉を失うほどの彩度。" },
    { id: "3", title: "Peel & Soul", date: "2023", type: "Abstract", desc: "内面を晒す勇気。" },
    { id: "4", title: "Organic Glitch", date: "2025", type: "Installation", desc: "自然界のバグとしての甘み。" },
    { id: "5", title: "Midnight Snack", date: "2022", type: "Photography", desc: "夜の静寂と果実。" },
    { id: "6", title: "Golden Curve", date: "2025", type: "Sculpture", desc: "金属による有機性の模倣。" },
  ]

  useEffect(() => {
    if (!db) {
      setArtworks(defaultArtworks)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const museumRef = collection(db, "artifacts", appId, "public", "data", "museum_artworks")
    const q = query(museumRef, orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedWorks: Artwork[] = []
        querySnapshot.forEach((docSnap) => {
          fetchedWorks.push({ id: docSnap.id, ...docSnap.data() } as Artwork)
        })
        setArtworks(fetchedWorks.length > 0 ? fetchedWorks : defaultArtworks)
        setIsLoading(false)
      },
      (err) => {
        console.log("Using default museum data:", err)
        setArtworks(defaultArtworks)
        setIsLoading(false)
      },
    )
    return () => unsubscribe()
  }, [db])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!db) {
      alert("Firebase not initialized.")
      return
    }
    if (confirm("Delete this artwork?")) {
      try {
        await deleteDoc(doc(db, "artifacts", appId, "public", "data", "museum_artworks", id))
      } catch (err) {
        console.error("Error deleting", err)
        alert("Could not delete.")
      }
    }
  }

  const handleEdit = (e: React.MouseEvent, artwork: Artwork) => {
    e.stopPropagation()
    setEditingArtwork(artwork)
    setIsEditorOpen(true)
  }

  const [currentPageMuseum, setCurrentPageMuseum] = useState(1)
  const itemsPerPageMuseum = 10

  const indexOfLastArtwork = currentPageMuseum * itemsPerPageMuseum
  const indexOfFirstArtwork = indexOfLastArtwork - itemsPerPageMuseum
  const currentArtworks = artworks.slice(indexOfFirstArtwork, indexOfLastArtwork)
  const totalPagesMuseum = Math.ceil(artworks.length / itemsPerPageMuseum)

  const nextPageMuseum = () => setCurrentPageMuseum(Math.min(currentPageMuseum + 1, totalPagesMuseum))
  const prevPageMuseum = () => setCurrentPageMuseum(Math.max(currentPageMuseum - 1, 1))

  return (
    <div className="min-h-screen bg-[#FAC800] text-black p-4 md:p-6 pt-24 md:pt-32 pb-20">
      <MuseumEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false)
          setEditingArtwork(null)
        }}
        user={user}
        editingArtwork={editingArtwork}
      />

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start mb-12 md:mb-20 border-b border-black pb-6 md:pb-8 relative">
          <button
            onClick={onBack}
            className="absolute -top-12 left-0 font-mono text-xs opacity-50 hover:opacity-100 flex items-center gap-2"
          >
            <ChevronLeft size={16} /> BACK HOME
          </button>

          <div>
            <span className="font-mono text-sm md:text-xs tracking-[0.3em] opacity-40 block mb-4">
              ARCHIVE COLLECTION
            </span>
            <h1 className="text-7xl md:text-9xl font-serif font-thin leading-none">MUSEUM</h1>
          </div>
          <div className="text-left mt-6 md:mt-0 flex flex-col items-start gap-4">
            <p className="font-mono text-lg md:text-xs opacity-60">
              Curated by HRK.877
              <br />
              Tokyo, Japan
            </p>
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingArtwork(null)
                  setIsEditorOpen(true)
                }}
                className="inline-flex items-center gap-2 bg-black text-[#FAC800] px-4 py-3 font-mono text-base md:text-xs tracking-widest hover:scale-105 transition-transform active:scale-95 touch-manipulation"
              >
                <Plus size={14} /> ADD ARTWORK
              </button>
            )}
          </div>
        </header>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center opacity-50">
            <ModernBananaSVG className="w-16 h-16 animate-spin duration-3000" />
            <span className="mt-4 font-mono text-base md:text-xs tracking-widest">LOADING COLLECTION...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
            {currentArtworks.map((art, i) => (
              <motion.div
                key={art.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
              >
                <div className="aspect-[3/4] bg-black relative overflow-hidden mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[#FAC800] opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                  {art.image ? (
                    <img
                      src={art.image || "/placeholder.svg"}
                      alt={art.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ModernBananaSVG
                      className={`w-48 h-48 text-[#FAC800] transition-transform duration-700 ${i % 2 === 0 ? "group-hover:rotate-12" : "group-hover:-rotate-12"
                        } group-hover:scale-110`}
                    />
                  )}

                  <div className="absolute bottom-6 right-6 font-mono text-[#FAC800] text-sm md:text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    NO. 0{indexOfFirstArtwork + i + 1}
                  </div>

                  {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
                      <button
                        onClick={(e) => handleEdit(e, art)}
                        className="p-2 bg-white text-black hover:bg-black hover:text-[#FAC800] rounded-full"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, art.id)}
                        className="p-2 bg-white text-black hover:bg-red-500 hover:text-white rounded-full"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-baseline border-t border-black pt-4">
                  <h3 className="text-3xl md:text-4xl font-serif group-hover:italic transition-all duration-300">
                    {art.title}
                  </h3>
                  <span className="font-mono text-base md:text-xs opacity-50">{art.date}</span>
                </div>
                <div className="flex justify-between items-baseline mt-2 opacity-60 font-mono text-lg md:text-xs">
                  <span>{art.type}</span>
                  <span>{art.desc}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && artworks.length > itemsPerPageMuseum && (
          <div className="mt-16 flex justify-center items-center gap-4 font-mono text-lg md:text-xs opacity-50">
            <button onClick={prevPageMuseum} disabled={currentPageMuseum === 1} className="disabled:opacity-20">
              <ChevronLeft size={24} />
            </button>
            <span>
              Page {currentPageMuseum} of {totalPagesMuseum}
            </span>
            <button
              onClick={nextPageMuseum}
              disabled={currentPageMuseum === totalPagesMuseum}
              className="disabled:opacity-20"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}

        <div className="mt-32 text-center">
          <p className="font-serif text-2xl md:text-xl italic opacity-50">&quot;Art mimics the banana.&quot;</p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Banana AI Page
// ============================================
const BananaAI = ({ onBack }: { onBack: () => void }) => {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([{ role: "ai", text: "ようこそ。曲線について語りましょうか、それとも。" }])
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const usedTriviaRef = useRef(new Set<number>())
  const usedEvasionsRef = useRef(new Set<number>())

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const getRandomUnique = (list: string[], historySet: React.MutableRefObject<Set<number>>) => {
    if (historySet.current.size >= list.length) {
      historySet.current.clear()
    }

    let availableIndices = list.map((_, i) => i).filter((i) => !historySet.current.has(i))
    if (availableIndices.length === 0) {
      historySet.current.clear()
      availableIndices = list.map((_, i) => i)
    }

    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
    historySet.current.add(randomIndex)
    return list[randomIndex]
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = input
    setMessages((prev) => [...prev, { role: "user", text: userMsg }])
    setInput("")
    setIsTyping(true)

    // Hide keyboard by blurring input
    inputRef.current?.blur()

    setTimeout(() => {
      const randomEvasion = getRandomUnique(BANANA_EVASIONS, usedEvasionsRef)
      const randomTrivia = getRandomUnique(BANANA_TRIVIA, usedTriviaRef)

      const responseText = `${randomEvasion}\n\n${randomTrivia}`

      setMessages((prev) => [...prev, { role: "ai", text: responseText }])
      setIsTyping(false)
    }, 1200)
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAC800] text-black p-4 md:p-6 pt-24 md:pt-32 flex flex-col">
      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">
        <header className="mb-6 md:mb-8 border-b border-black pb-4 md:pb-6 relative">
          <button
            onClick={onBack}
            className="absolute -top-12 left-0 font-mono text-xs opacity-50 hover:opacity-100 flex items-center gap-2"
          >
            <ChevronLeft size={16} /> BACK HOME
          </button>
          <span className="font-mono text-sm md:text-xs tracking-[0.3em] opacity-40 block mb-4">
            CONVERSATIONAL INTERFACE
          </span>
          <h1 className="text-7xl md:text-9xl font-serif font-thin leading-none">BANANA AI</h1>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-6 md:space-y-12 mb-4 pr-2 md:pr-4 scrollbar-hide min-h-0 max-h-[35vh] md:max-h-[50vh]"
        >
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <span className="font-mono text-sm md:text-[10px] mb-2 opacity-40 tracking-widest">
                {msg.role === "user" ? "YOU" : "BANANA AI"}
              </span>
              <div
                className={`max-w-[85%] ${msg.role === "user"
                    ? "text-right font-mono text-lg md:text-sm leading-relaxed tracking-wide opacity-70"
                    : "text-left font-serif text-2xl md:text-3xl leading-snug tracking-tight"
                  }`}
              >
                {msg.text.split("\n").map((line, idx) => (
                  <span key={idx} className="block min-h-[1em]">
                    {line}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex flex-col items-start">
              <span className="font-mono text-sm md:text-[10px] mb-2 opacity-40 tracking-widest">BANANA AI</span>
              <div className="font-serif text-2xl md:text-2xl animate-pulse opacity-50">...</div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="relative mt-auto w-full bg-[#FAC800] pb-safe pt-4">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your inquiry..."
            className="w-full bg-transparent border-b-2 border-black py-4 pr-14 font-mono text-lg md:text-sm placeholder:text-black/30 focus:outline-none focus:border-black/50 transition-colors rounded-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-0 top-1/2 -translate-y-1/2 hover:opacity-50 transition-opacity disabled:opacity-20 p-3 touch-manipulation"
          >
            <ArrowRight size={28} strokeWidth={1} />
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================
// Letter Page
// ============================================
const Letter = ({ onBack }: { onBack: () => void }) => {
  const [message, setMessage] = useState("")
  const [isSent, setIsSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!message.trim() || !db) return
    setLoading(true)
    try {
      const lettersRef = collection(db, "artifacts", appId, "public", "data", "letters")
      await addDoc(lettersRef, {
        message,
        to: "hrk.877",
        createdAt: serverTimestamp(),
        isAnonymous: true,
      })

      setIsSent(true)
    } catch (e) {
      console.error("Failed to send letter", e)
      setIsSent(true)
    }
    setLoading(false)
  }

  if (isSent) {
    return (
      <div className="min-h-screen bg-[#FAC800] text-black flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center"
        >
          <Banana size={96} className="mx-auto mb-8 text-black opacity-10" />
          <h2 className="text-4xl md:text-5xl font-serif mb-6">Received.</h2>
          <p className="font-mono text-sm md:text-xs tracking-widest opacity-60">YOUR WORDS HAVE TRAVELED.</p>
          <button
            onClick={() => {
              setIsSent(false)
              setMessage("")
            }}
            className="mt-12 text-sm font-mono underline opacity-40 hover:opacity-100 transition-opacity"
          >
            WRITE ANOTHER
          </button>
          <button
            onClick={onBack}
            className="block mx-auto mt-6 text-sm font-mono opacity-30 hover:opacity-100 transition-opacity"
          >
            BACK HOME
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAC800] text-black p-4 md:p-6 pt-24 md:pt-32 pb-20 flex flex-col">
      <div className="w-full max-w-2xl mx-auto relative flex-1 flex flex-col">
        <div className="mb-8 md:mb-12 border-b border-black pb-6 relative">
          <button
            onClick={onBack}
            className="absolute -top-12 left-0 font-mono text-xs opacity-50 hover:opacity-100 flex items-center gap-2"
          >
            <ChevronLeft size={16} /> BACK HOME
          </button>
          <span className="font-mono text-sm md:text-xs tracking-[0.3em] opacity-40 block mb-4">ANONYMOUS MESSAGE</span>
          <h1 className="text-7xl md:text-9xl font-serif font-thin leading-none">LETTER</h1>
        </div>

        <div className="flex-1 flex flex-col">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative flex-1">
            <div
              className="absolute inset-0 pointer-events-none opacity-5"
              style={{ backgroundImage: "linear-gradient(transparent 95%, #000 95%)", backgroundSize: "100% 3rem" }}
            />

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="letter-input w-full min-h-[40vh] bg-transparent focus:outline-none placeholder:text-black/20"
              autoFocus
            />
          </motion.div>

          <div className="mt-8 flex flex-row justify-between items-center gap-4 md:gap-6">
            <span className="font-mono text-sm md:text-[10px] opacity-30 tracking-widest">{message.length} CHARS</span>
            <button
              onClick={handleSend}
              disabled={!message.trim() || loading}
              className="group relative px-8 py-4 overflow-hidden border border-black rounded-full hover:border-black transition-colors disabled:opacity-20 disabled:hover:border-black/10 touch-manipulation active:scale-95"
            >
              <span className="relative z-10 font-mono text-sm md:text-xs tracking-[0.2em] group-hover:text-white transition-colors duration-500">
                {loading ? "SEALING..." : "SEND LETTER"}
              </span>
              <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  }, [db])

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
  }, [auth])

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
              <Blog
                isAdmin={isAdmin}
                user={user}
                onOpenPost={handleOpenPost}
              />
              <Footer
                isAdmin={isAdmin}
                handleSecretClick={handleSecretClick}
                handleLogout={handleLogout}
                setIsLoginOpen={setIsLoginOpen}
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
