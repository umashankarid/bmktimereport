import React, { useState } from 'react';
import '../styles/Responsibilities.css';

const content = {
  en: {
    title: '📋 Responsibilities',
    cards: [
      { icon: '📅', title: 'Daily Logging', desc: 'Log your coaching activities daily to maintain accurate records of your work and training sessions.' },
      { icon: '⏰', title: 'Time Tracking', desc: 'Record accurate start and end times for each activity to track your coaching hours and workload.' },
      { icon: '🎯', title: 'Activity Types', desc: 'Categorize your work properly - Training, Tournament, Meeting, or Other - for accurate reporting.' },
      { icon: '📝', title: 'Documentation', desc: 'Add notes to your activities to provide context and details about your coaching sessions.' },
      { icon: '✅', title: 'Accuracy', desc: 'Ensure all entries are accurate and up-to-date. Review your activity log regularly.' },
      { icon: '🔔', title: 'Compliance', desc: "Follow the organization's guidelines and reporting requirements for all activities." }
    ],
    tournament: {
      title: '🏸 Club Tournament Responsibilities',
      intro: 'Assistant coaches play a key role in making club tournaments run smoothly. Below are your duties before, during, and after match days.',
      before: {
        title: 'Before Tournament Day',
        items: [
          'Assist with loading and transporting tournament materials to and from the venue',
          'Help set up and fix the courts (nets, lines, posts)',
          'Set up the match help desk (scoring sheets, schedules, pens)',
          'Set up speakers and audio equipment',
          'Arrange tables and chairs for players, officials, and spectators',
          'Help organize medals, trophies, and prize materials',
          'Verify all equipment is in working condition'
        ]
      },
      during: {
        title: 'During Match Day',
        items: [
          "Coach club players under the head coach's instructions",
          'Support players between matches with feedback and warm-up',
          'Manage the live streaming of matches',
          'Assist at the match help desk when needed',
          'Help maintain the tournament schedule and flow'
        ]
      },
      after: {
        title: 'End of Match Day',
        items: [
          'Help tidy up the courts (remove nets, clean up)',
          'Pack down the match help desk',
          'Disassemble speakers and audio equipment',
          'Return tables, chairs, and equipment to storage',
          'Ensure the venue is left clean and in order'
        ]
      }
    },
    guidelines: {
      title: '📌 Important Guidelines',
      items: [
        'Log activities on the same day they occur',
        'Be precise with start and end times',
        'Use clear and descriptive activity notes',
        'Review your monthly activity summary',
        'Contact admin if you need to modify past entries'
      ]
    }
  },
  id: {
    title: '📋 Tanggung Jawab',
    cards: [
      { icon: '📅', title: 'Pencatatan Harian', desc: 'Catat aktivitas pelatihan Anda setiap hari untuk menjaga catatan kerja dan sesi latihan yang akurat.' },
      { icon: '⏰', title: 'Pencatatan Waktu', desc: 'Catat waktu mulai dan selesai yang akurat untuk setiap aktivitas guna melacak jam dan beban kerja pelatihan Anda.' },
      { icon: '🎯', title: 'Jenis Aktivitas', desc: 'Kategorikan pekerjaan Anda dengan benar - Latihan, Turnamen, Rapat, atau Lainnya - untuk pelaporan yang akurat.' },
      { icon: '📝', title: 'Dokumentasi', desc: 'Tambahkan catatan pada aktivitas Anda untuk memberikan konteks dan detail tentang sesi pelatihan Anda.' },
      { icon: '✅', title: 'Akurasi', desc: 'Pastikan semua entri akurat dan terbaru. Tinjau catatan aktivitas Anda secara berkala.' },
      { icon: '🔔', title: 'Kepatuhan', desc: 'Ikuti pedoman dan persyaratan pelaporan organisasi untuk semua aktivitas.' }
    ],
    tournament: {
      title: '🏸 Tanggung Jawab Turnamen Klub',
      intro: 'Asisten pelatih memainkan peran kunci dalam kelancaran turnamen klub. Berikut adalah tugas Anda sebelum, selama, dan setelah hari pertandingan.',
      before: {
        title: 'Sebelum Hari Turnamen',
        items: [
          'Membantu memuat dan mengangkut perlengkapan turnamen ke dan dari tempat pertandingan',
          'Membantu memasang dan memperbaiki lapangan (net, garis, tiang)',
          'Menyiapkan meja bantuan pertandingan (lembar skor, jadwal, pena)',
          'Memasang speaker dan peralatan audio',
          'Mengatur meja dan kursi untuk pemain, ofisial, dan penonton',
          'Membantu mengorganisir medali, piala, dan hadiah',
          'Memastikan semua peralatan dalam kondisi baik'
        ]
      },
      during: {
        title: 'Selama Hari Pertandingan',
        items: [
          'Melatih pemain klub di bawah instruksi pelatih kepala',
          'Mendukung pemain antar pertandingan dengan umpan balik dan pemanasan',
          'Mengelola siaran langsung pertandingan',
          'Membantu di meja bantuan pertandingan saat diperlukan',
          'Membantu menjaga jadwal dan alur turnamen'
        ]
      },
      after: {
        title: 'Akhir Hari Pertandingan',
        items: [
          'Membantu merapikan lapangan (melepas net, membersihkan)',
          'Membereskan meja bantuan pertandingan',
          'Membongkar speaker dan peralatan audio',
          'Mengembalikan meja, kursi, dan peralatan ke tempat penyimpanan',
          'Memastikan tempat pertandingan ditinggalkan bersih dan rapi'
        ]
      }
    },
    guidelines: {
      title: '📌 Pedoman Penting',
      items: [
        'Catat aktivitas pada hari yang sama saat terjadi',
        'Tepat dalam mencatat waktu mulai dan selesai',
        'Gunakan catatan aktivitas yang jelas dan deskriptif',
        'Tinjau ringkasan aktivitas bulanan Anda',
        'Hubungi admin jika Anda perlu mengubah entri sebelumnya'
      ]
    }
  }
};

function Responsibilities({ currentTrainer }) {
  const [lang, setLang] = useState('en');
  const isJunior = currentTrainer?.trainer_type === 'Junior Trainer';
  const t = content[lang];

  return (
    <div className="responsibilities-container">
      <div className="responsibilities-header">
        <h2>{t.title}</h2>
        <div className="lang-toggle">
          <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>
            🇬🇧 English
          </button>
          <button className={`lang-btn ${lang === 'id' ? 'active' : ''}`} onClick={() => setLang('id')}>
            🇮🇩 Indonesia
          </button>
        </div>
      </div>
      
      <div className="responsibilities-content">
        {t.cards.map((card, idx) => (
          <div key={idx} className="responsibility-card">
            <div className="card-icon">{card.icon}</div>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Tournament Responsibilities - Assistant Trainers */}
      {!isJunior && (
        <div className="tournament-responsibilities">
          <h3>{t.tournament.title}</h3>
          <p className="tournament-intro">{t.tournament.intro}</p>

          <div className="tournament-section">
            <div className="tournament-phase">
              <div className="phase-header">
                <span className="phase-icon">🔧</span>
                <h4>{t.tournament.before.title}</h4>
              </div>
              <ul>
                {t.tournament.before.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="tournament-phase">
              <div className="phase-header">
                <span className="phase-icon">🏆</span>
                <h4>{t.tournament.during.title}</h4>
              </div>
              <ul>
                {t.tournament.during.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="tournament-phase">
              <div className="phase-header">
                <span className="phase-icon">🧹</span>
                <h4>{t.tournament.after.title}</h4>
              </div>
              <ul>
                {t.tournament.after.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="responsibilities-guidelines">
        <h3>{t.guidelines.title}</h3>
        <ul>
          {t.guidelines.items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Responsibilities;
