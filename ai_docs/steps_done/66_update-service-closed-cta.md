# 66. Pembaruan Halaman Layanan Tutup (Call-to-Action)

## Deskripsi Pekerjaan
Pekerjaan ini mencakup penambahan elemen interaktif pada halaman "Service Closed" agar pengguna dapat dengan mudah kembali ke halaman utama ketika layanan telah dibuka kembali. Selain itu, tampilan halaman ditingkatkan agar tetap selaras dengan desain premium aplikasi.

## Perubahan Utama

### 1. Penambahan Informasi & Navigasi
- **Instruksi Baru:** Menambahkan teks keterangan "Jika sudah jam buka, tekan tombol ini:" di atas tombol aksi utama.
- **Tombol Masuk:** Menambahkan tombol "Masuk Sekarang" yang mengarah langsung ke root path (`/`) menggunakan komponen `Link` dari `react-router`.
- **Integrasi Ikon:** Menggunakan ikon `ArrowRight` dari Lucide untuk memberikan petunjuk visual navigasi.

### 2. Peningkatan Visual (Premium Design)
- **Layout Card:** Memperbarui radius sudut menjadi `rounded-3xl` dan menambahkan aksen background dekoratif di sudut atas.
- **Ikon Status:** Mengubah desain kontainer ikon `DoorClosed` menjadi bentuk kotak miring (*rotate*) yang lebih modern dan dinamis.
- **Tipografi:** Menggunakan bobot font `font-black` pada judul dan tombol untuk penekanan yang lebih kuat.
- **Feedback Interaksi:** Menambahkan efek *hover* (translate-x pada ikon) dan *active scale* (tekan tombol) untuk pengalaman pengguna yang lebih responsif.

### 3. Penambahan Kontak Bantuan
- Menambahkan footer berisi tautan WhatsApp Admin sebagai opsi bantuan cepat bagi customer yang memiliki pertanyaan saat layanan tutup.

## Verifikasi
- ✅ **Navigasi:** Tombol mengarah kembali ke `/` untuk mengecek status layanan terbaru.
- ✅ **Responsivitas:** Tampilan dioptimalkan untuk perangkat mobile dengan padding dan ukuran tombol yang pas di jari.
- ✅ **Visual:** Tampilan jauh lebih menarik dibanding versi sebelumnya yang hanya berupa teks statis dan tombol reload sederhana.

## File yang Dimodifikasi
- `src/app/pages/customer/ServiceClosed.tsx`
