'use client'
import { useEffect, useState } from 'react'

export default function TestPage() {
    const [pesan, setPesan] = useState('Menghubungkan...')

    useEffect(() => {
        fetch('http://localhost:8000/api/test-koneksi')
            .then(res => res.json())
            .then(data => setPesan(data.message))
            .catch(err => setPesan('Gagal terhubung: ' + err.message))
    }, [])

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Status Koneksi:</h1>
            <p style={{ color: pesan.includes('Gagal') ? 'red' : 'green' }}>
                {pesan}
            </p>
        </div>
    )
}