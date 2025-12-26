import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0iRq9z-KJxjnX_4CpjEZrwvX0hjvPb1w",
  authDomain: "ubify-598fe.firebaseapp.com",
  projectId: "ubify-598fe",
  storageBucket: "ubify-598fe.appspot.com",
  messagingSenderId: "291570754705",
  appId: "1:291570754705:web:c458124db5954b58d34b30"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allBusinesses = [];
let favoriteIds = JSON.parse(localStorage.getItem('ubify_fav_businesses')) || [];
let deletedFavCount = 0; // Variable para recordar cuántos se borraron
const categoryFilterSelect = document.getElementById('categoryFilter');

// --- Elementos DOM ---
const modal = document.getElementById('detailModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const closeModalBtn = document.getElementById('closeModalBtn');
const favModal = document.getElementById('favoritesModal');
const favBackdrop = document.getElementById('favBackdrop');
const closeFavBtn = document.getElementById('closeFavBtn');
const openFavoritesBtn = document.getElementById('openFavoritesBtn');
const favoritesContainer = document.getElementById('favoritesContainer');
const emptyFavorites = document.getElementById('emptyFavorites');
const favCounterBadge = document.getElementById('favCounterBadge');
const scrollTopBtn = document.getElementById('scrollTopBtn');

function generateSlug(text) {
    if (!text) return '';
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

// --- NUEVO: Cargar Categorías Dinámicas en el Filtro ---
async function loadCategories() {
    try {
        const configRef = doc(db, "configuracion", "general");
        const docSnap = await getDoc(configRef);
        
        let cats = ['Gastronomía', 'Indumentaria', 'Accesorios', 'Servicios', 'Tecnología', 'Hogar', 'Belleza']; // Defaults
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            if(data.categorias) cats = data.categorias;
        }

        // Limpiar y llenar select
        categoryFilterSelect.innerHTML = '<option value="">Todas las categorías</option>';
        cats.sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilterSelect.appendChild(option);
        });

    } catch (e) {
        console.error("Error cargando categorías:", e);
    }
}

async function loadBusinesses() {
  const container = document.getElementById('businessContainer');
  const loader = document.getElementById('loadingIndicator');
  const footer = document.getElementById('mainFooter');
  
  try {
    const querySnapshot = await getDocs(collection(db, "emprendimientos"));
    allBusinesses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // --- INICIO LÓGICA DE LIMPIEZA SILENCIOSA ---
    // 1. Obtenemos una lista con solo los IDs que realmente existen en la BD
    const existingIds = allBusinesses.map(b => b.id);

    // 2. Identificamos cuáles IDs tiene el usuario que YA NO existen en la BD
    const deletedIds = favoriteIds.filter(id => !existingIds.includes(id));

    // 3. Filtramos el array: nos quedamos solo con los que sí existen
    const cleanFavorites = favoriteIds.filter(id => existingIds.includes(id));

    // 4. Si hubo cambios, actualizamos localStorage PERO NO MOSTRAMOS ALERTA AÚN
    if (favoriteIds.length !== cleanFavorites.length) {
        // Guardamos la cantidad para mostrarla luego al abrir favoritos
        deletedFavCount = deletedIds.length;
        
        // Actualizamos la lista y localStorage
        favoriteIds = cleanFavorites;
        localStorage.setItem('ubify_fav_businesses', JSON.stringify(favoriteIds));
        
        console.log(`Limpieza silenciosa: Se detectaron ${deletedFavCount} favoritos eliminados.`);
    }
    // --- FIN LÓGICA DE LIMPIEZA ---

    loader.classList.add('hidden');
    container.classList.remove('hidden');
    
    renderBusinesses(allBusinesses);
    updateFavCounter(); // Actualiza el contador con el número real

    const urlParams = new URLSearchParams(window.location.search);
    const sharedParam = urlParams.get('id'); 
    
    if (sharedParam) {
        const sharedBusiness = allBusinesses.find(b => 
            b.id === sharedParam || generateSlug(b.nombre) === sharedParam
        );
        if (sharedBusiness) setTimeout(() => openBusinessModal(sharedBusiness), 200);
    }

  } catch (error) {
    console.error("Error:", error);
    loader.innerHTML = `<p class="text-red-500">Error al cargar datos. Intenta recargar.</p>`;
  } finally {
    if (footer) footer.classList.remove('hidden');
  }
}

function renderBusinesses(businesses) {
    const container = document.getElementById('businessContainer');
    const noResults = document.getElementById('noResults');
    container.innerHTML = '';
  
    if (businesses.length === 0) {
      container.classList.add('hidden');
      noResults.classList.remove('hidden');
      return;
    }
    
    noResults.classList.add('hidden');
    container.classList.remove('hidden');
  
    businesses.forEach(biz => {
      const card = createCardHTML(biz); 
      container.appendChild(card);
    });
}

function createCardHTML(biz) {
    const imageSrc = biz.imagen || 'https://via.placeholder.com/400x300?text=Sin+Imagen';
    let locationText = biz.ubicacion;
    if (!biz.ubicacion || biz.ubicacion.trim() === '') locationText = "Solo Delivery / A coordinar";
    const isFav = favoriteIds.includes(biz.id);
    const heartClass = isFav ? 'text-red-500 fill-current' : 'text-gray-400 fill-none';
    let tagsHtml = '';
    if (biz.tags && Array.isArray(biz.tags)) {
        biz.tags.slice(0, 3).forEach(tag => {
            tagsHtml += `<span class="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-full border border-gray-200 whitespace-nowrap">${getTagIcon(tag)} ${tag}</span>`;
        });
    }
    const card = document.createElement('div');
    card.className = 'group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1 cursor-pointer border border-gray-100 relative';
    card.onclick = () => openBusinessModal(biz);
    let whatsappBtn = '', instaBtn = '', webBtn = '';
    if(biz.telefono) {
       const text = `Hola ${biz.nombre}, vi su perfil en Ubify y quería consultar...`;
       const link = `https://wa.me/${biz.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
       whatsappBtn = `<a href="${link}" target="_blank" onclick="event.stopPropagation()" class="flex-1 min-w-[40px] flex items-center justify-center py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-500 hover:text-white transition-all"><i class="fab fa-whatsapp text-lg"></i></a>`;
    }
    if(biz.instagram) {
       instaBtn = `<a href="${biz.instagram}" target="_blank" onclick="event.stopPropagation()" class="flex-1 min-w-[40px] flex items-center justify-center py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-500 hover:text-white transition-all"><i class="fab fa-instagram text-lg"></i></a>`;
    }
    if(biz.web) {
       webBtn = `<a href="${biz.web}" target="_blank" onclick="event.stopPropagation()" class="flex-1 min-w-[40px] flex items-center justify-center py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all"><i class="fas fa-globe text-lg"></i></a>`;
    }
    card.innerHTML = `
      <div class="relative h-48 md:h-52 overflow-hidden bg-gray-50 flex items-center justify-center border-b border-gray-100">
        <img src="${imageSrc}" alt="${biz.nombre}" class="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500">
        <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-bold text-gray-600 shadow-sm border border-gray-100">
          ${getCategoryIcon(biz.categoria)} ${biz.categoria || 'Varios'}
        </div>
        <button onclick="toggleFavorite(event, '${biz.id}')" class="absolute top-3 right-3 bg-white p-2 rounded-full shadow-md hover:scale-110 transition-transform z-10 border border-gray-100" title="Guardar">
            <svg id="heart-${biz.id}" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ${heartClass} transition-colors duration-300" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        </button>
      </div>
      <div class="p-4 flex flex-col flex-1 relative">
        <h3 class="text-lg font-bold text-gray-800 mb-1 leading-tight group-hover:text-blue-600 transition-colors">
            ${biz.nombre}
        </h3>
        <div class="flex items-center text-gray-500 text-xs mb-3">
            <svg class="w-3 h-3 mr-1 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span class="truncate">${locationText}</span>
        </div>
        <div class="flex flex-wrap gap-1 mb-3">
            ${tagsHtml}
        </div>
        <p class="text-gray-500 text-xs mb-4 line-clamp-2 flex-1">
          ${biz.descripcion || 'Sin descripción.'}
        </p>
        <div class="flex gap-2 mt-auto pt-3 border-t border-gray-50">
           ${whatsappBtn} ${instaBtn} ${webBtn}
        </div>
      </div>
    `;
    return card;
}

window.toggleFavorite = function(event, id) {
    event.stopPropagation();
    const index = favoriteIds.indexOf(id);
    if (index === -1) { favoriteIds.push(id); showToast("Agregado a favoritos"); } else { favoriteIds.splice(index, 1); showToast("Eliminado de favoritos"); }
    localStorage.setItem('ubify_fav_businesses', JSON.stringify(favoriteIds));
    const hearts = document.querySelectorAll(`[id^='heart-${id}']`);
    hearts.forEach(heart => {
        if (index === -1) { heart.classList.remove('text-gray-400', 'fill-none'); heart.classList.add('text-red-500', 'fill-current'); } else { heart.classList.remove('text-red-500', 'fill-current'); heart.classList.add('text-gray-400', 'fill-none'); }
    });
    updateFavCounter();
    if (!favModal.classList.contains('hidden')) renderFavoritesList();
}

function updateFavCounter() { const count = favoriteIds.length; if (count > 0) { favCounterBadge.textContent = count; favCounterBadge.classList.remove('hidden'); } else { favCounterBadge.classList.add('hidden'); } }

function renderFavoritesList() {
    favoritesContainer.innerHTML = '';
    const favBusinesses = allBusinesses.filter(b => favoriteIds.includes(b.id));
    if (favBusinesses.length === 0) { emptyFavorites.classList.remove('hidden'); favoritesContainer.classList.add('hidden'); return; }
    emptyFavorites.classList.add('hidden'); favoritesContainer.classList.remove('hidden');
    favBusinesses.forEach(biz => { const card = createCardHTML(biz); favoritesContainer.appendChild(card); });
}

// --- MODIFICACIÓN DEL EVENTO CLICK EN FAVORITOS ---
openFavoritesBtn.addEventListener('click', () => { 
    // Verificar si había notificaciones pendientes de la limpieza
    if (deletedFavCount > 0) {
        const message = deletedFavCount === 1 
            ? "Uno de tus favoritos ya no está disponible." 
            : `Se eliminaron ${deletedFavCount} favoritos que ya no están disponibles.`;
        
        showTemporaryAlert(message, 'warning');
        
        // Reseteamos a 0 para que no salga la alerta cada vez
        deletedFavCount = 0; 
    }

    renderFavoritesList(); 
    favModal.classList.remove('hidden'); 
    document.body.classList.add('overflow-hidden'); 
});

function closeFavModal() { favModal.classList.add('hidden'); document.body.classList.remove('overflow-hidden'); }
closeFavBtn.addEventListener('click', closeFavModal); favBackdrop.addEventListener('click', closeFavModal);
window.addEventListener('scroll', () => { if (window.scrollY > 300) { scrollTopBtn.classList.remove('hidden'); } else { scrollTopBtn.classList.add('hidden'); } });
scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });

function openBusinessModal(biz) {
    const imageSrc = biz.imagen || 'https://via.placeholder.com/600x400';
    const hasLocation = (biz.ubicacion && biz.ubicacion.trim() !== '');
    const address = hasLocation ? biz.ubicacion : 'Solo Delivery / A coordinar';
    document.getElementById('modalTitle').textContent = biz.nombre;
    document.getElementById('modalCategory').textContent = biz.categoria || 'Comercio';
    let tagsDesc = '';
    if (biz.tags && Array.isArray(biz.tags) && biz.tags.length > 0) {
        tagsDesc = '<div class="flex flex-wrap gap-2 mb-4">';
        biz.tags.forEach(tag => { tagsDesc += `<span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-100 flex items-center gap-1">${getTagIcon(tag)} ${tag}</span>`; });
        tagsDesc += '</div>';
    }
    document.getElementById('modalDesc').innerHTML = tagsDesc + (biz.descripcion || 'Sin descripción detallada.');
    document.getElementById('modalLocation').textContent = address;
    const modalImg = document.getElementById('modalImg');
    modalImg.src = imageSrc;
    modalImg.className = "w-full h-full object-contain p-4 bg-gray-100";
    const iframeMap = document.getElementById('modalMap');
    const loadingOverlay = document.getElementById('mapLoadingOverlay');
    const mapContainer = document.getElementById('modalMapContainer');
    const shouldShowMap = (biz.mostrarMapa !== false) && ((biz.ubicacion && biz.ubicacion.trim() !== '') || (biz.mapUrl && biz.mapUrl.trim() !== ''));
    if (shouldShowMap) {
        mapContainer.classList.remove('hidden'); loadingOverlay.classList.remove('hidden'); iframeMap.src = ''; 
        let mapUrlStr = '';
        if (biz.mapUrl && biz.mapUrl.length > 10) mapUrlStr = biz.mapUrl;
        else { const mapQuery = encodeURIComponent(address + ", Villa Angela, Chaco, Argentina"); mapUrlStr = `http://googleusercontent.com/maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`; }
        iframeMap.onload = function() { loadingOverlay.classList.add('hidden'); }; iframeMap.src = mapUrlStr;
    } else { mapContainer.classList.add('hidden'); }
    const btnContainer = document.getElementById('modalButtons');
    let buttonsHtml = '';
    const commonBtnClass = "flex flex-row items-center justify-center gap-2 p-2 rounded-lg transition border text-center group";
    if(biz.telefono) {
        const text = `Hola ${biz.nombre}, vi su perfil en Ubify y quería consultar...`;
        const waLink = `https://wa.me/${biz.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
        buttonsHtml += `<a href="${waLink}" target="_blank" class="${commonBtnClass} bg-green-50 text-green-700 hover:bg-green-100 border-green-100"><i class="fab fa-whatsapp text-xl"></i><span class="text-xs font-bold">WhatsApp</span></a>`;
    }
    if(biz.instagram) { buttonsHtml += `<a href="${biz.instagram}" target="_blank" class="${commonBtnClass} bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100"><i class="fab fa-instagram text-xl"></i><span class="text-xs font-bold">Instagram</span></a>`; }
    if(biz.web) { buttonsHtml += `<a href="${biz.web}" target="_blank" class="${commonBtnClass} bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100"><i class="fas fa-globe text-xl"></i><span class="text-xs font-bold">Web</span></a>`; }
    const slug = generateSlug(biz.nombre); const idToShare = slug || biz.id; const shareUrl = window.location.origin + window.location.pathname + '?id=' + idToShare;
    buttonsHtml += `<button onclick="shareProfile('${shareUrl}')" class="${commonBtnClass} bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200"><i class="fas fa-link text-xl"></i><span class="text-xs font-bold">Copiar Link</span></button>`;
    btnContainer.innerHTML = buttonsHtml;
    modal.classList.remove('hidden'); document.body.classList.add('overflow-hidden');
}

window.shareProfile = async (url) => { copyToClipboard(url); }
async function copyToClipboard(text) { try { await navigator.clipboard.writeText(text); showToast("¡Link copiado! Compartilo"); } catch (err) { const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select(); try { document.execCommand('copy'); showToast("¡Link copiado! Compartilo"); } catch (e) { alert("No se pudo copiar el link"); } document.body.removeChild(textArea); } }
function showToast(message) { const existing = document.querySelector('.toast-notification'); if (existing) existing.remove(); const toast = document.createElement('div'); toast.className = 'toast-notification fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-3 sm:px-6 rounded-full shadow-2xl z-[3000] animate-fade-in flex items-center gap-3 text-xs sm:text-sm font-medium border border-gray-800 whitespace-nowrap'; toast.innerHTML = `<span class="bg-green-500 rounded-full p-1"><svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span>${message}`; document.body.appendChild(toast); setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'all 0.3s'; toast.style.transform = 'translate(-50%, 20px)'; setTimeout(() => toast.remove(), 300); }, 3000); }
function closeModal() { modal.classList.add('hidden'); document.body.classList.remove('overflow-hidden'); document.getElementById('modalMap').src = ''; const url = new URL(window.location); url.searchParams.delete('id'); window.history.replaceState({}, '', url); }
closeModalBtn.addEventListener('click', closeModal); modalBackdrop.addEventListener('click', closeModal); document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!modal.classList.contains('hidden')) closeModal(); if (!favModal.classList.contains('hidden')) closeFavModal(); } });

function filterBusinesses() {
  const searchTerm = document.getElementById('searchBusiness').value.toLowerCase().trim();
  const categoryValue = document.getElementById('categoryFilter').value;
  const synonyms = { 'comida': 'gastronomía', 'almuerzo': 'gastronomía', 'cena': 'gastronomía', 'bebidas': 'gastronomía', 'tragos': 'gastronomía', 'hamburguesa': 'gastronomía', 'pizza': 'gastronomía', 'helado': 'gastronomía', 'bar': 'gastronomía', 'restaurante': 'gastronomía', 'delivery': 'gastronomía', 'ropa': 'indumentaria', 'moda': 'indumentaria', 'zapatillas': 'indumentaria', 'calzado': 'indumentaria', 'vestido': 'indumentaria', 'remera': 'indumentaria', 'celular': 'tecnología', 'pc': 'tecnología', 'computadora': 'tecnología', 'iphone': 'tecnología', 'funda': 'tecnología', 'cargador': 'tecnología', 'regalo': 'accesorios', 'joya': 'accesorios', 'reloj': 'accesorios', 'muebles': 'hogar', 'deco': 'hogar', 'sillón': 'hogar', 'mesa': 'hogar', 'uñas': 'belleza', 'pelo': 'belleza', 'maquillaje': 'belleza', 'makeup': 'belleza', 'peluquería': 'belleza', 'estética': 'belleza' };
  let impliedCategory = '';
  for (const key in synonyms) { if (searchTerm.includes(key)) { impliedCategory = synonyms[key].toLowerCase(); break; } }
  const filtered = allBusinesses.filter(biz => {
    const matchesSearch = biz.nombre.toLowerCase().includes(searchTerm) || (biz.descripcion && biz.descripcion.toLowerCase().includes(searchTerm)) || (biz.categoria && biz.categoria.toLowerCase().includes(searchTerm)) || (impliedCategory && biz.categoria && biz.categoria.toLowerCase().includes(impliedCategory));
    const matchesCategory = categoryValue === "" || biz.categoria === categoryValue;
    return matchesSearch && matchesCategory;
  });
  renderBusinesses(filtered);
}

function getCategoryIcon(cat) { const icons = { 'Gastronomía': '🍔', 'Indumentaria': '👗', 'Accesorios': '💍', 'Tecnología': '💻', 'Servicios': '🛠️', 'Hogar': '🏠', 'Belleza': '💅' }; return icons[cat] || '✨'; }
function getTagIcon(tag) { const icons = { 'Delivery': '🛵', 'Tarjetas': '💳', 'WiFi': '📶', 'Pet Friendly': '🐶', 'Aire Acond.': '❄️' }; return icons[tag] || '•'; }

document.addEventListener('DOMContentLoaded', () => {
  loadCategories(); 
  loadBusinesses();
  document.getElementById('searchBusiness').addEventListener('input', filterBusinesses);
  document.getElementById('categoryFilter').addEventListener('change', filterBusinesses);
  window.filterBusinesses = filterBusinesses;
});

/**
 * Muestra una alerta temporal superior (ESTILO MEJORADO).
 * Tipos: 'success' (verde), 'warning' (naranja), 'error' (rojo)
 */
function showTemporaryAlert(message, type = 'info') {
    // Verificar si ya existe el contenedor, si no, crearlo
    let alertDiv = document.getElementById('tempAlert');
    if (!alertDiv) {
        alertDiv = document.createElement('div');
        alertDiv.id = 'tempAlert';
        alertDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[5000] text-white font-medium text-sm transition-all duration-500 opacity-0 flex items-center gap-2 border border-white/20 backdrop-blur-md';
        document.body.appendChild(alertDiv);
    }

    // Definir colores e iconos según el tipo
    const configs = {
        success: { bg: 'bg-green-600', icon: '✅' },
        warning: { bg: 'bg-orange-500', icon: '⚠️' },
        error:   { bg: 'bg-red-600', icon: '❌' },
        info:    { bg: 'bg-blue-600', icon: 'ℹ️' }
    };
    
    const config = configs[type] || configs.info;

    // Resetear clases de color anteriores y aplicar las nuevas
    alertDiv.className = alertDiv.className.replace(/bg-\w+-\d+/g, '');
    alertDiv.classList.add(config.bg);
    
    alertDiv.innerHTML = `<span>${config.icon}</span> <span>${message}</span>`;

    // Mostrar
    requestAnimationFrame(() => {
        alertDiv.classList.remove('opacity-0', '-translate-y-full');
    });

    // Ocultar después de 5 segundos
    setTimeout(() => {
        alertDiv.classList.add('opacity-0');
        // Remover del DOM tras la animación
        setTimeout(() => {
            if(alertDiv.parentNode) alertDiv.parentNode.removeChild(alertDiv);
        }, 500);
    }, 5000);
}
