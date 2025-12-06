"use client"

const GlobalStyles = () => (
    <style jsx global>{`
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

export default GlobalStyles
