// /pages/api/submit.js atau kode handler POST di /app/api/submit/route.js

import pg from 'pg'; 
const { Pool } = pg; // Kita tetap gunakan Pool untuk serverless

// Ambil Sertifikat CA dari Environment Variable
// ASUMSI: Anda sudah mengatur variabel Vercel bernama CA_CERT yang berisi sertifikat penuh.
// JIKA TIDAK: Ganti process.env.CA_CERT dengan string sertifikat yang Anda kirimkan.
const CA_CERTIFICATE = process.env.CA_CERT || `
-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUF0Eu3rFdYYwlndFqMmH24Od86dUwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1YjgxMGQ1MzQtYWVlNy00NjRiLWJmODMtY2E2NGU4ZTZj
YWNlIEdFTiAxIFByb2plY3QgQ0EwHhcNMjUxMDIwMTMxNzI1WhcNMzUxMDE4MTMx
NzI1WjBAMT4wPAYDVQQDDDViODEwZDUzNC1hZWU3LTQ2NGItYmY4My1jYTY0ZThl
NmNhY2UgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBAO43tOqlYMNnc1u1LDRfz1H+D1uY35M6amsMbk6d4Qk/9Dl/0WD9X8td
MoKho8OrjyF/rTms94PTP1K+lPhAzSreVZg6j8djtEjYM3NcmlwStF8uzcCz+4lr
sxcftdnBxGfUcBlLy83EeuWrTgf/6wYWWuzFnGjGFylBSRaOgjdQx0ETJ55US1D7
xZmaW4gy59uK/iyBU0uq4ZhhEB/Ky79HAho/atTjf6Lgj2VUsWdH9+fBy6598YlF
/GeoWWr6y2C3sSzfzs15FNnXEZhKopGciya3xOETJTi/DX7PHkmJuX+PISEJrWOQ
XfeOCWFIqbO5lEzXr0057wOHanA6nFPPjxcXWJMv2FKz9eNXQdIqsvoTYgkEmkz9
V4u0WDyk7ZwqtVvvCGAcZR7GVrlIvgsRj4Um8yHVzPb+lpUIN61wS1HI1Crivgtk
B9Xjl1wZz5X4NVKFC+Vi40IfTwlXOj9+wfQ1c+GGh0lS0ZCiXs1WgwWk89u1+xqJ
KdGvnoFb7QIDAQABo0IwQDAdBgNVHQ4EFgQU2LuZFVebAjbG7bF9BrzS32wDusQw
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBAFTnp3xRgtRguTBZ41ZlpPS+aue/Wz7MOg8a88jauyvEFMGxPYQ0goMWOKNI
KeIfkP8jlNnmzF3a9GympCuU+UBrEpUqj/mMAcj44IaRVdso+M7g/+aMqW87Xfub
wcViewx2wazE7MyaADutVau+r/eojnTrXZFHXTHnHoil/XgfivqC14e9k8hgVopJ
p/c/f1GJu3WBmBPllRpLjkhX/8h2x1cZ5BH8HAABROR4a3ptmhi/Ue0413S1liRG
6Azw8gEkFN9qUpE+1Q4VDq5LH5UYByJJTodNu/OsV4Nvyyw9rsuz7QqbkvN+JKos
79KjJx/1nUbg0OlKHQmn2vQH63nMLUzVDFuYp8qYajlakcun9PMrImded+zltcVM
V75mFffF15KnQhj4YV0wpnNHIU3WlOAm0ciqzyozTwXprT/rN1dIe9KAzuXzcR7Q
7DjIY7cgA2PHN+RejkSBI9OpnBNGNRgLpn8SGqFYeSImE5Ddw3lADjFjInsPh5et
YuieJg==
-----END CERTIFICATE-----
`.trim(); // Trim untuk menghapus spasi/newline berlebih

// Konfigurasi Pool koneksi (Wajib untuk serverless)
const pool = new Pool({
    // Kita gunakan URI dari ENV variable untuk menghindari hardcoding user/pass/host/port
    connectionString: process.env.DATABASE_URL, 
    ssl: {
        // Hapus rejectUnauthorized: false dan ganti dengan sertifikat CA untuk keamanan yang lebih baik
        rejectUnauthorized: true, // Verifikasi harus diaktifkan
        ca: CA_CERTIFICATE, // Sertifikat CA yang kita sediakan
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
