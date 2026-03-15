
"use client"

import { motion } from "framer-motion"
import type React from "react"
import { PauseLogo } from "../PauseLogo"

interface ShaderBackgroundProps {
  children?: React.ReactNode
}

export function ShaderBackground({ children }: ShaderBackgroundProps) {
  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#6E7568]">
      {/* Static Background - Sage Base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#6E7568] via-[#6E7568] to-[#5a6155]" />
      
      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
      
      {/* Subtle Shapes - Cream and Espresso accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[80%] bg-[#FBF7EF] rounded-full mix-blend-overlay opacity-10 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[60%] h-[60%] bg-[#26150B] rounded-full mix-blend-overlay opacity-10 blur-[120px]" />
      </div>

      {children}
    </div>
  )
}

export function PulsingCircle() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
       {/* Ambient Glow */}
       <motion.div 
         animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
         transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
         className="w-[500px] h-[500px] bg-[#FBF7EF] rounded-full blur-[100px] mix-blend-overlay"
       />
       
       {/* Rotating Ring 1 - Dashed */}
       <motion.div
         animate={{ rotate: 360 }}
         transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
         className="absolute w-[600px] h-[600px] border border-[#FBF7EF]/10 rounded-full"
         style={{ borderStyle: 'dashed', borderWidth: '1px' }}
       />

       {/* Rotating Ring 2 - Thin Solid */}
       <motion.div
         animate={{ rotate: -360 }}
         transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
         className="absolute w-[450px] h-[450px] border border-[#FBF7EF]/5 rounded-full"
         style={{ borderWidth: '0.5px' }}
       />

        {/* Inner Breathing Pulse */}
        <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-[300px] h-[300px] border border-[#FBF7EF]/20 rounded-full"
        />
    </div>
  )
}

export function HeroContent() {
  return (
    <main className="absolute bottom-8 left-8 z-20 max-w-lg">
      <div className="text-left">
        <div
          className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#FBF7EF]/10 backdrop-blur-md mb-6 relative border border-[#FBF7EF]/20"
        >
          <div className="absolute top-0 left-1 right-1 h-px bg-gradient-to-r from-transparent via-[#FBF7EF]/30 to-transparent rounded-full" />
          <span className="text-[#FBF7EF] text-xs font-semibold tracking-widest uppercase relative z-10">✨ The Dome Experience</span>
        </div>

        <h1 className="text-5xl md:text-6xl md:leading-[1.1] tracking-tight font-light text-[#FBF7EF] mb-6">
          <span className="font-['Dancing_Script'] font-bold text-[#FBF7EF] mr-2">Fluid</span>
          <span className="font-['Montserrat'] font-light">Movement</span>
          <br />
          <span className="font-['Montserrat'] font-bold tracking-tight text-[#FBF7EF]">Integration</span>
        </h1>

        <p className="text-sm font-light text-[#FBF7EF]/80 mb-8 leading-relaxed max-w-md">
          Step into a space where movement meets structure. Explore the interconnected web of your fascia through guided workshops designed to release, realign, and restore.
        </p>

        <div className="flex items-center gap-4 flex-wrap">
          <button className="px-8 py-3.5 rounded-full bg-[#FBF7EF] text-[#26150B] font-bold text-xs uppercase tracking-widest transition-all duration-200 hover:bg-white shadow-lg cursor-pointer border border-transparent">
            Explore Classes
          </button>
          <button className="px-8 py-3.5 rounded-full bg-transparent border border-[#FBF7EF]/30 text-[#FBF7EF] font-bold text-xs uppercase tracking-widest transition-all duration-200 hover:bg-[#FBF7EF]/10 hover:border-[#FBF7EF]/50 cursor-pointer">
            Member Login
          </button>
        </div>
      </div>
    </main>
  )
}

export function Header() {
  return (
    <header className="relative z-20 flex items-center justify-between p-8">
      <div className="flex items-center gap-3">
         <PauseLogo size="sm" light />
      </div>

      <nav className="hidden md:flex items-center space-x-1">
        <a href="#" className="text-[#FBF7EF]/70 hover:text-[#FBF7EF] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full hover:bg-[#FBF7EF]/5 transition-all">Workshops</a>
        <a href="#" className="text-[#FBF7EF]/70 hover:text-[#FBF7EF] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full hover:bg-[#FBF7EF]/5 transition-all">About</a>
        <a href="#" className="text-[#FBF7EF]/70 hover:text-[#FBF7EF] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full hover:bg-[#FBF7EF]/5 transition-all">Contact</a>
      </nav>

      <div className="relative flex items-center group">
        <button className="px-8 py-2.5 rounded-full bg-[#FBF7EF] text-[#26150B] font-bold text-xs uppercase tracking-wider transition-all duration-300 hover:bg-[#EDE8DC] cursor-pointer h-10 flex items-center z-10">
          Member Sign In
        </button>
      </div>
    </header>
  )
}
