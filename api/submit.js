// /pages/api/submit.js atau kode handler POST di /app/api/submit/route.js

import pg from 'pg'; 
const { Pool } = pg; 

// Konfigurasi koneksi ke Aiven PostgreSQL Anda.
// Kredensial diambil dari Environment Variable Vercel (DATABASE_URL).
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, 
    ssl: {
        // PERBAIKAN KRITIS UNTUK MENGATASI ERROR SSL/SERTIFIKAT (self-signed certificate)
        // Ini memberitahu Node.js untuk tidak menolak koneksi meskipun sertifikat tidak dapat diverifikasi penuh.
        rejectUnauthorized: false, 
    },
    // Pengaturan optimal untuk lingkungan Serverless (Vercel Functions)
    max: 2, 
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 2000,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    let client;
    try {
        const data = req.body;
        
        // 1. Validasi Sederhana Data
        if (!data['input-q1-nama'] || !data['input-q1-instansi']) {
            return res.status(400).json({ success: false, error: 'Nama dan Instansi wajib diisi.' });
        }

        // Dapatkan koneksi dari pool
        client = await pool.connect(); 

        // 2. Query SQL Parameterized (Mencegah SQL Injection)
        const query = `
            INSERT INTO survey_submissions (
                input_q1_nama,
                input_q1_instansi,
                q2_pengalaman,
                q3_kualitas,
                q4_harapan,
                input_q5_pesan
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `;
        
        const values = [
            data['input-q1-nama'],
            data['input-q1-instansi'],
            data['q2'], 
            data['q3'], 
            data['q4'], 
            data['input-q5-pesan']
        ];
        
        await client.query(query, values);
        
        // 3. Respon Sukses
        return res.status(200).json({ 
            success: true, 
            message: 'Data survei berhasil disimpan ke PostgreSQL.' 
        });

    } catch (error) {
        // Catat error ke konsol Vercel untuk debugging
        console.error('PostgreSQL Connection/Query Error:', error.message); 
        return res.status(500).json({ 
            success: false, 
            error: `Terjadi kesalahan server saat menyimpan data. Detail: ${error.message}` 
        });
    } finally {
        // 4. Pastikan Koneksi Selalu Dikembalikan
        if (client) {
            client.release(); 
        }
    }
}
