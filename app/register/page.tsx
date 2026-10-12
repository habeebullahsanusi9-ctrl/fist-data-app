'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function Register(){
  const router=useRouter(); const [form,setForm]=useState({fullName:'',email:'',phone:'',password:''}); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);setError('');const r=await fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const d=await r.json();setLoading(false);if(!r.ok){setError(d.error||'Could not register');return}router.push('/dashboard');}
  return <main className="wrap"><nav className="nav"><div className="brand">FIST <span>DATA</span></div><a href="/">Home</a></nav><div className="auth card"><h1>Create account</h1><p className="muted">Open your FIST DATA account.</p><form onSubmit={submit} className="form">{[['fullName','Full name'],['email','Email'],['phone','Phone number'],['password','Password (6+ characters)']].map(([k,l])=><label key={k}>{l}<input type={k==='password'?'password':'text'} value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} required /></label>)}{error&&<div className="error">{error}</div>}<button className="btn primary" disabled={loading}>{loading?'Creating...':'Create account'}</button></form><p>Already registered? <a href="/login">Log in</a></p></div></main>
}
