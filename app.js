// 1. VERİ YAPISI VE BAŞLATMA
// Rezervasyonları, üyeleri ve kapalı saatleri tarayıcı hafızasında (LocalStorage) saklıyoruz.
const adminCredentials = { ad: 'sahip', sifre: '1234' };
let rezervasyonlar = JSON.parse(localStorage.getItem('haliSahaVerileri')) || [];
let blockedSlots = JSON.parse(localStorage.getItem('haliSahaKapaliSlotlar')) || [];
let owners = JSON.parse(localStorage.getItem('sahaSahibiUyeleri')) || [];
let selectedField = null;

const sahalar = [
    { title: 'Kütahya Kentpark Halı Saha', rating: 4.8, price: '390-490 TL', location: 'Merkez / KÜTAHYA', owner: 'Ali Yılmaz', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80' },
    { title: 'Etap43 Halısaha', rating: 4.7, price: '420-500 TL', location: 'Merkez / KÜTAHYA', owner: 'Mehmet Demir', image: 'https://images.unsplash.com/photo-1508873699372-7ae2c57a5484?auto=format&fit=crop&w=900&q=80' },
    { title: 'Dayanlar Halı Saha', rating: 4.6, price: '400-470 TL', location: 'Merkez / KÜTAHYA', owner: 'Ayşe Çelik', image: 'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=900&q=80' },
    { title: 'Güleçler Halı Saha', rating: 4.5, price: '380-450 TL', location: 'Merkez / KÜTAHYA', owner: 'Emre Aksoy', image: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=900&q=80' },
    { title: 'Berkay Çim Halı Saha', rating: 4.7, price: '410-495 TL', location: 'Merkez / KÜTAHYA', owner: 'Berkay Yıldız', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80' },
    { title: 'Yeşilay Kapalı', rating: 4.4, price: '430-520 TL', location: 'Merkez / KÜTAHYA', owner: 'Seda Korkmaz', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80' }
];

// Sayfa yüklendiğinde mevcut kayıtları ve takvimi güncelle
document.addEventListener('DOMContentLoaded', () => {
    const pageField = getCurrentFieldFromPage();
    if (pageField) {
        selectedField = pageField;
        updateSelectedFieldLabel();
    } else {
        renderSahaList();
    }
    tabloyuGuncelle();
    takvimiGuncelle();
    girisKontrol();
});

function isAdminUser() {
    return localStorage.getItem('sahaSahibiGiris') === 'true';
}

function girisKontrol() {
    const admin = isAdminUser();
    const loginCard = document.getElementById('loginCard');
    const adminPanel = document.getElementById('adminPanel');
    const bookingCard = document.getElementById('bookingCard');
    if (loginCard) loginCard.classList.toggle('hidden', admin);
    if (adminPanel) adminPanel.classList.toggle('hidden', !admin);
    if (bookingCard) bookingCard.classList.toggle('hidden', false);
    tabloyuGuncelle();
    takvimiGuncelle();
    adminPanelGuncelle();
}

function adminGiris() {
    const adminAd = document.getElementById('adminAd').value.trim();
    const adminSifre = document.getElementById('adminSifre').value.trim();

    if (adminAd === adminCredentials.ad && adminSifre === adminCredentials.sifre) {
        localStorage.setItem('sahaSahibiGiris', 'true');
        closeAdminLoginModal();
        alert('Yönetici girişi başarılı. Yönetici panelini açabilirsiniz.');
        girisKontrol();
    } else {
        alert('Giriş bilgileri hatalı. Lütfen tekrar deneyin.');
    }
}

function getCurrentFieldFromPage() {
    const fieldPage = document.body.dataset.fieldPage;
    const fieldTitle = document.body.dataset.fieldTitle;
    return fieldPage === 'true' && fieldTitle ? fieldTitle : null;
}

function updateSelectedFieldLabel() {
    const selectedFieldName = document.getElementById('selectedFieldName');
    if (selectedFieldName && selectedField) {
        selectedFieldName.textContent = selectedField;
    }
}

function navigateToField(fieldTitle) {
    const urls = {
        'Kütahya Kentpark Halı Saha': 'kentpark.html',
        'Etap43 Halısaha': 'etap43.html',
        'Dayanlar Halı Saha': 'dayanlar.html',
        'Güleçler Halı Saha': 'gulecler.html',
        'Berkay Çim Halı Saha': 'berkay.html',
        'Yeşilay Kapalı': 'yesilay.html'
    };
    const target = urls[fieldTitle];
    if (target) {
        window.location.href = target;
    }
}

function adminCikis() {
    localStorage.removeItem('sahaSahibiGiris');
    alert('Yönetici çıkış yaptı.');
    girisKontrol();
}

function showAdminLoginModal() {
    document.getElementById('adminLoginModal').classList.remove('hidden');
}

function closeAdminLoginModal() {
    document.getElementById('adminLoginModal').classList.add('hidden');
}

function selectField(fieldTitle) {
    selectedField = fieldTitle;
    const selectedFieldName = document.getElementById('selectedFieldName');
    if (selectedFieldName) {
        selectedFieldName.textContent = fieldTitle;
    }
    renderSahaList();
    document.getElementById('bookingCard')?.scrollIntoView({ behavior: 'smooth' });
}

// 2. REZERVASYON OLUŞTURMA VE ÇAKIŞMA KONTROLÜ
function rezervasyonYap() {
    const adSoyad = document.getElementById('adSoyad').value.trim();
    const telefon = document.getElementById('telefon').value.trim();
    const kapora = document.getElementById('kapora').value;
    const tarih = document.getElementById('tarih').value;
    const saat = document.getElementById('saat').value;

    if (!selectedField) {
        alert('Lütfen soldan bir saha seçin ve sonra rezervasyon yapın.');
        return;
    }

    if (!adSoyad || !telefon || !tarih || !saat) {
        alert("Lütfen tüm zorunlu alanları eksiksiz doldurun.");
        return;
    }

    const kapali = blockedSlots.some(slot => slot.tarih === tarih && slot.saat === saat);
    if (kapali) {
        alert("⚠️ Bu saat şu anda kapalı. Lütfen başka bir zaman seçin.");
        return;
    }

    const cakismaVarMi = rezervasyonlar.some(res => res.tarih === tarih && res.saat === saat);
    if (cakismaVarMi) {
        alert("⚠️ Bu saat dilimi dolu! Lütfen başka bir zaman seçin.");
        return;
    }

    const fiyat = hesaplaFiyat(tarih, saat);
    const timestamp = new Date(`${tarih}T${saat}`).getTime();

    const yeniRezervasyon = {
        id: Date.now(),
        musteri: adSoyad,
        tel: telefon,
        kapora: kapora,
        saha: selectedField,
        tarih: tarih,
        saat: saat,
        ucret: fiyat,
        onayDurumu: false,
        timestamp: timestamp
    };

    rezervasyonlar.push(yeniRezervasyon);
    veriyiKaydet();
    alert("✅ Rezervasyon talebi alındı. Haftalık takvimde durumunu görebilirsiniz.");
    formuTemizle();
}

function hesaplaFiyat(tarih, saat) {
    const date = new Date(`${tarih}T${saat}`);
    const hour = parseInt(saat.split(':')[0], 10);
    const weekend = date.getDay() === 0 || date.getDay() === 6;

    if (weekend) {
        return hour >= 20 ? "1700 TL (Hafta Sonu Gece)" : "1400 TL (Hafta Sonu Gündüz)";
    }

    return hour >= 20 ? "1500 TL (Hafta İçi Gece)" : "1200 TL (Hafta İçi Gündüz)";
}

// 3. YÖNETİM PANELİ İŞLEVLERİ
function onayla(id) {
    const index = rezervasyonlar.findIndex(res => res.id === id);
    if (index !== -1) {
        rezervasyonlar[index].onayDurumu = true;
        veriyiKaydet();
        if (confirm('Müşteriye WhatsApp ile onay mesajı göndermek ister misiniz?')) {
            whatsappBildirimGonder(rezervasyonlar[index].id);
        }
    }
}

function whatsappBildirimGonder(id) {
    const reservation = rezervasyonlar.find(res => res.id === id);
    if (!reservation) {
        alert('Rezervasyon bulunamadı.');
        return;
    }

    let phone = reservation.tel.replace(/\D/g, '');
    if (phone.startsWith('0')) {
        phone = '90' + phone.slice(1);
    }
    if (phone.startsWith('+')) {
        phone = phone.slice(1);
    }
    if (!phone.match(/^\d{10,15}$/)) {
        alert('Geçerli bir telefon numarası girin.');
        return;
    }

    const message = `Merhaba ${reservation.musteri}, ${reservation.tarih} ${reservation.saat} rezervasyonunuz onaylanmıştır. SahaMatik ile iyi maçlar.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function sil(id) {
    if (confirm("Bu rezervasyonu silmek istediğinize emin misiniz?")) {
        rezervasyonlar = rezervasyonlar.filter(res => res.id !== id);
        veriyiKaydet();
    }
}

function toggleSlotBlock(tarih, saat) {
    const existing = blockedSlots.find(slot => slot.tarih === tarih && slot.saat === saat);
    if (existing) {
        blockedSlots = blockedSlots.filter(slot => !(slot.tarih === tarih && slot.saat === saat));
        alert(`${tarih} ${saat} kapalı saat açıldı.`);
    } else {
        blockedSlots.push({ id: Date.now(), tarih: tarih, saat: saat });
        alert(`${tarih} ${saat} manuel olarak kapatıldı.`);
    }
    veriyiKaydet();
}

// 4. YARDIMCI FONKSYONLAR
function veriyiKaydet() {
    localStorage.setItem('haliSahaVerileri', JSON.stringify(rezervasyonlar));
    localStorage.setItem('haliSahaKapaliSlotlar', JSON.stringify(blockedSlots));
    tabloyuGuncelle();
    takvimiGuncelle();
    adminPanelGuncelle();
}

function formatDateYMD(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatWeekday(date) {
    const days = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    return days[date.getDay()];
}

function tabloyuGuncelle() {
    const liste = document.getElementById('rezervasyonListesi');
    if (!liste) return;

    liste.innerHTML = "";
    const sorted = [...rezervasyonlar].sort((a, b) => a.timestamp - b.timestamp);

    if (sorted.length === 0) {
        liste.innerHTML = '<div class="empty-message">Henüz rezervasyon yok. Takvimden uygun bir saat seçebilirsiniz.</div>';
        return;
    }

    const filtered = selectedField ? sorted.filter(res => res.saha === selectedField) : sorted;
    if (selectedField && filtered.length === 0) {
        liste.innerHTML = '<div class="empty-message">Henüz bu saha için rezervasyon yok.</div>';
        return;
    }

    const admin = isAdminUser();
    filtered.forEach(res => {
        const actions = admin ? `
            <div class="card-buttons">
                <button onclick="onayla(${res.id})">Onayla</button>
                <button onclick="sil(${res.id})">İptal Et</button>
                <button class="btn-whatsapp" onclick="whatsappBildirimGonder(${res.id})">WhatsApp Gönder</button>
            </div>
        ` : '';

        const kart = `
            <div class="rezervasyon-kart ${res.onayDurumu ? 'onayli' : ''}">
                <p><strong>${res.tarih} | ${res.saat}</strong></p>
                <p>Saha: ${res.saha || 'Belirtilmedi'}</p>
                <p>Müşteri: ${res.musteri}</p>
                <p>Telefon: ${res.tel}</p>
                <p>Kapora: ${res.kapora}</p>
                <p>Fiyat: ${res.ucret}</p>
                <p>Durum: ${res.onayDurumu ? '✅ Onaylandı' : '⏳ Onay Bekliyor'}</p>
                ${actions}
            </div>
        `;
        liste.innerHTML += kart;
    });
}

function adminPanelGuncelle() {
    const panel = document.getElementById('adminPanelList');
    if (!panel) return;
    if (!isAdminUser()) {
        panel.innerHTML = '';
        return;
    }

    panel.innerHTML = '';

    const ownersSection = document.createElement('div');
    ownersSection.className = 'admin-section';
    ownersSection.innerHTML = `<h3>Üye Kayıtları</h3>`;
    if (owners.length === 0) {
        ownersSection.innerHTML += '<div class="empty-message">Henüz üye kaydı bulunmuyor.</div>';
    } else {
        owners.forEach(owner => {
            ownersSection.innerHTML += `
                <div class="rezervasyon-kart">
                    <p><strong>${owner.adSoyad}</strong></p>
                    <p>Telefon: ${owner.telefon}</p>
                    <p>Saha: ${owner.saha}</p>
                    <p>Mail: ${owner.email}</p>
                    <p>Şehir: ${owner.sehir}</p>
                </div>
            `;
        });
    }
    panel.appendChild(ownersSection);

    const reservationSection = document.createElement('div');
    reservationSection.className = 'admin-section';
    reservationSection.innerHTML = '<h3>Rezervasyon Yönetimi</h3>';
    const sorted = [...rezervasyonlar].sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length === 0) {
        reservationSection.innerHTML += '<div class="empty-message">Henüz rezervasyon yok.</div>';
    } else {
        sorted.forEach(res => {
            reservationSection.innerHTML += `
                <div class="rezervasyon-kart ${res.onayDurumu ? 'onayli' : ''}">
                    <p><strong>${res.tarih} | ${res.saat}</strong></p>
                    <p>Saha: ${res.saha || 'Belirtilmedi'}</p>
                    <p>Müşteri: ${res.musteri}</p>
                    <p>Telefon: ${res.tel}</p>
                    <p>Kapora: ${res.kapora}</p>
                    <p>Fiyat: ${res.ucret}</p>
                    <p>Durum: ${res.onayDurumu ? '✅ Onaylandı' : '⏳ Onay Bekliyor'}</p>
                    <div class="card-buttons">
                        <button onclick="onayla(${res.id})">Onayla</button>
                        <button onclick="sil(${res.id})">İptal Et</button>
                        <button class="btn-whatsapp" onclick="whatsappBildirimGonder(${res.id})">WhatsApp Gönder</button>
                    </div>
                </div>
            `;
        });
    }
    panel.appendChild(reservationSection);
}

function showSignupModal() {
    document.getElementById('signupModal').classList.remove('hidden');
}

function closeSignupModal() {
    document.getElementById('signupModal').classList.add('hidden');
}

function ownerSignup() {
    const adSoyad = document.getElementById('ownerAdSoyad').value.trim();
    const telefon = document.getElementById('ownerTelefon').value.trim();
    const email = document.getElementById('ownerEmail').value.trim();
    const sehir = document.getElementById('ownerSehir').value.trim();
    const saha = document.getElementById('ownerSaha').value;

    if (!adSoyad || !telefon || !email || !sehir || !saha) {
        alert('Lütfen tüm alanları eksiksiz doldurun.');
        return;
    }

    const mevcut = owners.some(owner => owner.telefon === telefon || owner.email === email);
    if (mevcut) {
        alert('Bu telefon veya e-posta zaten kayıtlı. Lütfen kontrol edin.');
        return;
    }

    const yeniOwner = {
        id: Date.now(),
        adSoyad,
        telefon,
        email,
        sehir,
        saha
    };
    owners.push(yeniOwner);
    localStorage.setItem('sahaSahibiUyeleri', JSON.stringify(owners));
    alert('Üyelik kaydınız başarılı! Yönetici başvurunuz incelenecek.');
    closeSignupModal();
    renderSahaList();
    adminPanelGuncelle();
}

function renderSahaList() {
    const sahaList = document.getElementById('fieldList');
    if (!sahaList) return;
    sahaList.innerHTML = sahalar.map(saha => {
        const registeredOwner = owners.find(owner => owner.saha === saha.title);
        const ownerName = registeredOwner ? registeredOwner.adSoyad : saha.owner;
        const ownerStatus = registeredOwner ? 'Kayıtlı Sahip' : 'Saha Sahibi';
        const activeClass = selectedField === saha.title ? 'active' : '';
        return `
            <div class="saha-card ${activeClass}">
                <div class="saha-image" style="background-image:url('${saha.image}')"></div>
                <div class="saha-body">
                    <h3>${saha.title}</h3>
                    <p class="saha-meta">${saha.location}</p>
                    <div class="saha-info-row">
                        <span class="saha-price">${saha.price}</span>
                        <span class="saha-rating">★ ${saha.rating}</span>
                    </div>
                    <p class="saha-owner"><strong>${ownerStatus}:</strong> ${ownerName}</p>
                    <div class="saha-footer">
                        <button onclick="navigateToField('${saha.title}')">Rezervasyon Yap</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function takvimiGuncelle() {
    const calendar = document.getElementById('weeklyCalendar');
    if (!calendar) return;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const dayOfWeek = start.getDay();
    const monday = new Date(start);
    monday.setDate(start.getDate() - ((dayOfWeek + 6) % 7));

    const slots = ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
    const days = [];
    for (let i = 0; i < 7; i += 1) {
        const current = new Date(monday);
        current.setDate(monday.getDate() + i);
        days.push(current);
    }

    calendar.innerHTML = '';
    const headerRow = document.createElement('div');
    headerRow.className = 'calendar-row header-row';
    headerRow.innerHTML = '<div class="calendar-cell time-cell"></div>' + days.map(day => `
        <div class="calendar-cell day-cell">
            <span>${formatWeekday(day)}</span>
            <strong>${formatDateYMD(day)}</strong>
        </div>
    `).join('');
    calendar.appendChild(headerRow);

    slots.forEach(slot => {
        const row = document.createElement('div');
        row.className = 'calendar-row';
        const timeCell = document.createElement('div');
        timeCell.className = 'calendar-cell time-cell';
        timeCell.textContent = slot;
        row.appendChild(timeCell);

        days.forEach(day => {
            const dateKey = formatDateYMD(day);
            const isReserved = rezervasyonlar.some(res => res.tarih === dateKey && res.saat === slot && (!selectedField || res.saha === selectedField));
            const isBlocked = blockedSlots.some(slotItem => slotItem.tarih === dateKey && slotItem.saat === slot);
            const cell = document.createElement('div');
            cell.className = 'calendar-cell slot-cell';

            if (isReserved) {
                cell.classList.add('slot-busy');
                cell.innerHTML = '<span>DOLU</span>';
            } else if (isBlocked) {
                cell.classList.add('slot-blocked');
                cell.innerHTML = `<span>KAPALI</span><button onclick="toggleSlotBlock('${dateKey}','${slot}')">Aç</button>`;
            } else {
                cell.classList.add('slot-free');
                cell.innerHTML = `<span>BOŞ</span><button onclick="toggleSlotBlock('${dateKey}','${slot}')">Kapat</button>`;
            }

            row.appendChild(cell);
        });

        calendar.appendChild(row);
    });
}

function formuTemizle() {
    document.getElementById('adSoyad').value = "";
    document.getElementById('telefon').value = "";
    document.getElementById('kapora').value = 'Hayır';
}
