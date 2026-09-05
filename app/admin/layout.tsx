'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkAdminPassword, loginAdmin, isAdminLoggedIn } from '@/lib/store'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    setLoggedIn(isAdminLoggedIn())
    setChecking(false)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (checkAdminPassword(password)) {
      loginAdmin()
      setLoggedIn(true)
      setError(false)
    } else {
      setError(true)
      setPassword('')
    }
  }

  if (checking) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f4f0e9'}}>
        <div style={{width:'40px',height:'40px',border:'3px solid #20251f',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      </div>
    )
  }

  if (!loggedIn) {
    return (
      <div style={{
        minHeight:'100vh',
        background:'#f4f0e9',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        fontFamily:'system-ui, sans-serif',
        padding:'1rem',
      }}>
        <div style={{
          background:'#20251f',
          color:'#f4f0e9',
          borderRadius:'12px',
          padding:'2.5rem',
          width:'100%',
          maxWidth:'380px',
          boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <div style={{textAlign:'center',marginBottom:'2rem'}}>
            <span style={{fontSize:'2rem'}}>🔐</span>
            <h1 style={{fontFamily:'Georgia,serif',fontSize:'1.6rem',marginTop:'0.5rem',marginBottom:'0.25rem'}}>
              Espace Admin
            </h1>
            <p style={{fontSize:'0.75rem',color:'#b8c8a6',letterSpacing:'0.1em',textTransform:'uppercase'}}>
              Maison Lune Paris
            </p>
          </div>

          <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div>
              <label style={{fontSize:'0.7rem',textTransform:'uppercase',letterSpacing:'0.12em',color:'#b8c8a6',display:'block',marginBottom:'0.4rem'}}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false) }}
                placeholder="••••••••••"
                autoFocus
                style={{
                  width:'100%',
                  background:'#2a302a',
                  border: error ? '1px solid #ef4444' : '1px solid #3a403a',
                  borderRadius:'6px',
                  padding:'0.75rem 1rem',
                  color:'#f4f0e9',
                  fontSize:'0.875rem',
                  outline:'none',
                  boxSizing:'border-box',
                }}
              />
              {error && (
                <p style={{fontSize:'0.7rem',color:'#ef4444',marginTop:'0.4rem'}}>
                  Mot de passe incorrect. Réessayez.
                </p>
              )}
            </div>
            <button
              type="submit"
              style={{
                background:'#b8c8a6',
                color:'#20251f',
                border:'none',
                borderRadius:'6px',
                padding:'0.85rem',
                fontWeight:700,
                fontSize:'0.75rem',
                textTransform:'uppercase',
                letterSpacing:'0.14em',
                cursor:'pointer',
                marginTop:'0.5rem',
              }}
            >
              Accéder à l'administration →
            </button>
          </form>

          <p style={{fontSize:'0.65rem',color:'#555',textAlign:'center',marginTop:'1.5rem'}}>
            Mot de passe par défaut : <code style={{color:'#b8c8a6'}}>admin1234</code>
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
