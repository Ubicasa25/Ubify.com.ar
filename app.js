import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración de Firebase
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

let properties = [];
let favoriteProperties = JSON.parse(localStorage.getItem('favoriteProperties')) || [];

// Variables para paginación
let currentFeaturedPage = 1;
let currentAllPropertiesPage = 1;
let currentSearchPage = 1;
const PROPERTIES_PER_PAGE = 4;

function getCurrencySymbol(currency) {
  switch(currency) {
    case 'USD': return 'USD ';
    case 'EUR': return '€';
    default: return 'ARS $';
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function updateFavoritesCounter() {
  const favoritesCounter = document.getElementById('favoritesCounter');
  if (favoritesCounter) {
    // Recargar favoritos desde localStorage para asegurar sincronización
    const storedFavorites = localStorage.getItem('favoriteProperties');
    const currentFavorites = storedFavorites ? JSON.parse(storedFavorites) : [];
    
    const validFavorites = currentFavorites.filter(id =>
      properties.some(prop => prop.id === id)
    );
    
    favoritesCounter.textContent = validFavorites.length;
    favoritesCounter.style.display = validFavorites.length > 0 ? 'flex' : 'none';
    
    if (validFavorites.length > 0) {
      favoritesCounter.classList.add('animate-ping');
      setTimeout(() => favoritesCounter.classList.remove('animate-ping'), 500);
    }
    
    // Actualizar la variable global
    favoriteProperties = currentFavorites;
  }
}

export function toggleFavoriteProperty(propertyId, event) {
  if (event) event.stopPropagation();
  
  try {
    // Recargar favoritos desde localStorage para asegurar sincronización
    const storedFavorites = localStorage.getItem('favoriteProperties');
    favoriteProperties = storedFavorites ? JSON.parse(storedFavorites) : [];
    
    const index = favoriteProperties.indexOf(propertyId);
    if (index === -1) {
      favoriteProperties.push(propertyId);
      showToast('Propiedad añadida a favoritos', 'success');
      
      // Animación de éxito
      const button = event.target.closest('.favorite-btn');
      if (button) {
        button.classList.add('animate-ping');
        setTimeout(() => button.classList.remove('animate-ping'), 500);
      }
    } else {
      favoriteProperties.splice(index, 1);
      showToast('Propiedad removida de favoritos', 'info');
    }
    
    // Guardar en localStorage con verificación
    localStorage.setItem('favoriteProperties', JSON.stringify(favoriteProperties));
    
    // Actualizar contador y UI inmediatamente
    updateFavoritesCounter();
    
    // Actualizar todos los botones de favoritos en la página
    updateAllFavoriteButtons();
    
    // Si el modal está abierto, actualizarlo
    const modal = document.getElementById('favoritesModal');
    if (modal && !modal.classList.contains('hidden')) {
      showFavoritesModal();
    }
    
    // Disparar evento personalizado para notificar cambios
    window.dispatchEvent(new CustomEvent('favoritesUpdated', {
      detail: { propertyId, isFavorited: index === -1, favorites: favoriteProperties }
    }));
    
    console.log('Favoritos actualizados:', favoriteProperties);
  } catch (error) {
    console.error('Error al actualizar favoritos:', error);
    showToast('Error al actualizar favoritos', 'error');
  }
}

// Nueva función para actualizar el estado del botón de favorito
function updateFavoriteButton(propertyId) {
  const favoriteButtons = document.querySelectorAll(`[data-property-id="${propertyId}"]`);
  favoriteButtons.forEach(button => {
    const isFavorited = isPropertyInFavorites(propertyId);
    button.classList.toggle('favorited', isFavorited);
    button.setAttribute('aria-label', isFavorited ? 'Remover de favoritos' : 'Añadir a favoritos');
    
    // Actualizar el SVG del botón
    const svg = button.querySelector('svg');
    if (svg) {
      if (isFavorited) {
        svg.style.fill = 'white';
        svg.style.stroke = 'white';
      } else {
        svg.style.fill = 'none';
        svg.style.stroke = '#4b5563';
      }
    }
  });
}

// Función para actualizar todos los botones de favoritos en la página
function updateAllFavoriteButtons() {
  const allFavoriteButtons = document.querySelectorAll('.favorite-btn[data-property-id]');
  allFavoriteButtons.forEach(button => {
    const propertyId = button.getAttribute('data-property-id');
    if (propertyId) {
      updateFavoriteButton(propertyId);
    }
  });
}

export function isPropertyInFavorites(propertyId) {
  // Siempre leer desde localStorage para obtener los datos más actuales
  const storedFavorites = localStorage.getItem('favoriteProperties');
  const currentFavorites = storedFavorites ? JSON.parse(storedFavorites) : [];
  return currentFavorites.includes(propertyId);
}

export function clearFavorites() {
  favoriteProperties = [];
  localStorage.setItem('favoriteProperties', JSON.stringify(favoriteProperties));
  updateFavoritesCounter();
  showFavoritesModal();
  showToast('Favoritos limpiados', 'info');
  filterProperties();
  
  // Disparar evento personalizado
  window.dispatchEvent(new CustomEvent('favoritesUpdated', {
    detail: { favorites: favoriteProperties }
  }));
}

// Función para obtener el número de favoritos desde cualquier página
export function getFavoritesCount() {
  const storedFavorites = localStorage.getItem('favoriteProperties');
  const favorites = storedFavorites ? JSON.parse(storedFavorites) : [];
  return favorites.length;
}

// Función para obtener los IDs de favoritos
export function getFavoritesIds() {
  const storedFavorites = localStorage.getItem('favoriteProperties');
  return storedFavorites ? JSON.parse(storedFavorites) : [];
}

export function clearSearchFilters() {
  const searchInput = document.getElementById('searchInput');
  const operationFilter = document.getElementById('operationFilter');
  const typeFilter = document.getElementById('typeFilter');
  const sortPrice = document.getElementById('sortPrice');
  
  if (searchInput) searchInput.value = '';
  if (operationFilter) operationFilter.value = '';
  if (typeFilter) typeFilter.value = '';
  if (sortPrice) sortPrice.value = '';
  
  filterProperties();
  showToast('Filtros limpiados', 'info');
}

export function showToast(message, type = 'info') {
  // Remover toasts existentes
  const existingToasts = document.querySelectorAll('.toast-notification');
  existingToasts.forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'warning' ? 'bg-yellow-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  
  // Clases mejoradas para móviles
  toast.className = `fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 ${bgColor} text-white px-4 py-3 sm:px-6 sm:py-3 rounded-xl shadow-2xl z-50 animate-slide-up toast-notification max-w-sm sm:max-w-md mx-auto`;
  
  // Agregar icono según el tipo
  const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center flex-1">
        <span class="text-lg mr-3 flex-shrink-0">${icon}</span>
        <span class="font-medium text-sm sm:text-base leading-tight">${message}</span>
      </div>
      <button class="ml-3 text-white/80 hover:text-white transition-colors flex-shrink-0" onclick="this.parentElement.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remover después de 4 segundos
  setTimeout(() => {
    toast.classList.add('animate-slide-down');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
  
  // Permitir cerrar haciendo clic en el toast
  toast.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SVG' && e.target.tagName !== 'PATH') {
      toast.classList.add('animate-slide-down');
      setTimeout(() => toast.remove(), 300);
    }
  });
}

export function showFavoritesModal() {
  const modal = document.getElementById('favoritesModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const favoritesList = document.getElementById('favoritesList');
  const emptyMessage = document.getElementById('emptyFavoritesMessage');
  favoritesList.innerHTML = '';
  
  // Leer favoritos actuales desde localStorage
  const storedFavorites = localStorage.getItem('favoriteProperties');
  const currentFavorites = storedFavorites ? JSON.parse(storedFavorites) : [];
  
  const validFavorites = currentFavorites.filter(id =>
    properties.some(prop => prop.id === id)
  );
  if (validFavorites.length === 0) {
    emptyMessage.classList.remove('hidden');
    return;
  }
  emptyMessage.classList.add('hidden');
  const propertiesToDisplay = properties.filter(p => validFavorites.includes(p.id));
  propertiesToDisplay.forEach(property => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 overflow-hidden group';
    card.innerHTML = `
      <div class="flex gap-4 p-4">
        <div class="flex-shrink-0 relative">
          <img src="${property.images?.[0] || 'https://via.placeholder.com/300x200'}" alt="${property.title}" class="w-24 h-24 object-cover rounded-lg">
          <div class="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
            ${property.featured ? '⭐ Destacada' : property.operation}
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">${property.title}</h3>
          <div class="flex flex-wrap gap-2 mb-2">
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">${property.type}</span>
            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">${property.operation}</span>
            ${property.location ? `<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">${property.location}</span>` : ''}
          </div>
          <p class="text-lg font-bold text-gray-900 mb-2">${getCurrencySymbol(property.currency)}${property.price ? property.price.toLocaleString() : 'Consultar'}</p>
          <p class="text-sm text-gray-600 line-clamp-2 mb-3">${property.description || 'Sin descripción disponible'}</p>
          <div class="flex gap-2 text-xs text-gray-500 mb-3">
            ${property.bedrooms ? `<span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>${property.bedrooms}</span>` : ''}
            ${property.bathrooms ? `<span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-6a1 1 0 011-1h10a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>${property.bathrooms}</span>` : ''}
            ${property.squareMeters ? `<span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 1v10h10V5H5z" clip-rule="evenodd"></path></svg>${property.squareMeters}m²</span>` : ''}
          </div>
          <div class="flex gap-2">
            <a href="property-details.html?slug=${property.slug}" class="flex-1 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 text-center">
              Ver detalles
            </a>
            <button class="favorite-btn ${isPropertyInFavorites(property.id) ? 'favorited' : ''} p-2 hover:bg-gray-100 rounded-lg transition"
                    data-property-id="${property.id}"
                    aria-label="${isPropertyInFavorites(property.id) ? 'Remover de favoritos' : 'Añadir a favoritos'}">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>`;
    favoritesList.appendChild(card);
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
      toggleFavoriteProperty(property.id, e);
      favoriteBtn.classList.toggle('favorited', isPropertyInFavorites(property.id));
      favoriteBtn.setAttribute('aria-label', isPropertyInFavorites(property.id) ? 'Remover de favoritos' : 'Añadir a favoritos');
    });
  });
}

export function closeFavoritesModal() {
  const modal = document.getElementById('favoritesModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }
}

async function loadPropertiesFromFirestore() {
  try {
    // Mostrar indicador de carga inicial
    const loadingIndicator = document.getElementById('searchLoadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.classList.remove('hidden');
    }
    
    // Ocultar secciones de propiedades mientras se cargan
    const featuredSection = document.getElementById('featuredSection');
    const allPropertiesSection = document.getElementById('allPropertiesSection');
    if (featuredSection) featuredSection.classList.add('hidden');
    if (allPropertiesSection) allPropertiesSection.classList.add('hidden');
    
    const querySnapshot = await getDocs(collection(db, "propiedades"));
    properties = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Ocultar indicador de carga
    if (loadingIndicator) {
      loadingIndicator.classList.add('hidden');
    }
    
    // Mostrar secciones de propiedades después de cargar
    if (featuredSection) featuredSection.classList.remove('hidden');
    if (allPropertiesSection) allPropertiesSection.classList.remove('hidden');
    
    // Mostrar el footer después de cargar las propiedades
    const mainFooter = document.getElementById('mainFooter');
    if (mainFooter) {
      mainFooter.classList.remove('hidden');
    }
    
    updateFavoritesCounter();
    filterProperties();
    
  } catch (error) {
    console.error("Error al cargar propiedades:", error);
    
    // Ocultar indicador de carga en caso de error
    const loadingIndicator = document.getElementById('searchLoadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.classList.add('hidden');
    }
    
    // Mostrar secciones incluso si hay error para que no quede vacío
    const featuredSection = document.getElementById('featuredSection');
    const allPropertiesSection = document.getElementById('allPropertiesSection');
    if (featuredSection) featuredSection.classList.remove('hidden');
    if (allPropertiesSection) allPropertiesSection.classList.remove('hidden');
    
    // Mostrar el footer incluso si hay error
    const mainFooter = document.getElementById('mainFooter');
    if (mainFooter) {
      mainFooter.classList.remove('hidden');
    }
    
    showToast('Error al cargar las propiedades. Intenta recargar la página.', 'error');
  }
}

function renderProperties(filteredProperties, containerId, showPagination = false, currentPage = 1) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Calcular propiedades a mostrar según paginación
  let propertiesToShow = filteredProperties;
  let totalProperties = filteredProperties.length;
  
  if (showPagination) {
    const startIndex = (currentPage - 1) * PROPERTIES_PER_PAGE;
    const endIndex = startIndex + PROPERTIES_PER_PAGE;
    propertiesToShow = filteredProperties.slice(startIndex, endIndex);
  }
  
  container.innerHTML = '';
  propertiesToShow.forEach(property => {
    const card = document.createElement('div');
    card.className = 'property-card group cursor-pointer';
    card.innerHTML = `
      <div class="card-image relative overflow-hidden">
        <img src="${property.images?.[0] || 'https://via.placeholder.com/300x200'}"
             alt="${property.title}"
             class="w-full h-full object-cover transition duration-500 group-hover:scale-105"
             loading="lazy">
        <button class="favorite-btn ${isPropertyInFavorites(property.id) ? 'favorited' : ''} absolute top-3 right-3"
                data-property-id="${property.id}"
                aria-label="${isPropertyInFavorites(property.id) ? 'Remover de favoritos' : 'Añadir a favoritos'}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        ${property.featured ? '<div class="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">⭐ Destacada</div>' : ''}
      </div>
      <div class="card-content">
        <div class="card-body">
          <h4 class="text-lg font-montserrat font-semibold text-gray-800 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">${property.title}</h4>
          <div class="flex flex-wrap gap-2 mb-3">
            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">${property.type}</span>
            <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">${property.operation}</span>
            ${property.location ? `<span class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">${property.location}</span>` : ''}
          </div>
          <p class="text-xl font-bold text-gray-900 mb-3">${getCurrencySymbol(property.currency)}${property.price ? property.price.toLocaleString() : 'Consultar'}</p>
          <p class="text-gray-500 text-sm line-clamp-2 mb-4">${property.description || 'Sin descripción disponible'}</p>
          <div class="flex gap-3 text-sm text-gray-600 mb-4">
            ${property.bedrooms ? `<span class="flex items-center bg-blue-50 px-3 py-2 rounded-lg border border-blue-200"><i class="fas fa-bed text-blue-600 mr-2"></i><span class="font-medium text-blue-800">${property.bedrooms}</span></span>` : ''}
            ${property.bathrooms ? `<span class="flex items-center bg-green-50 px-3 py-2 rounded-lg border border-green-200"><i class="fas fa-bath text-green-600 mr-2"></i><span class="font-medium text-green-800">${property.bathrooms}</span></span>` : ''}
            ${property.squareMeters ? `<span class="flex items-center bg-purple-50 px-3 py-2 rounded-lg border border-purple-200"><i class="fas fa-ruler-combined text-purple-600 mr-2"></i><span class="font-medium text-purple-800">${property.squareMeters}m²</span></span>` : ''}
          </div>
        </div>
        <div class="card-footer">
          <div class="text-center py-2">
            <p class="text-gray-400 text-xs">
              <i class="fas fa-hand-pointer mr-1"></i>
              Haz click para ver detalles
            </p>
          </div>
        </div>
      </div>`;
    container.appendChild(card);
    
    // Hacer que toda la tarjeta sea clickeable
    card.addEventListener('click', (e) => {
      // Evitar que se active cuando se hace click en el botón de favoritos
      if (e.target.closest('.favorite-btn')) {
        return;
      }
      // Navegar a los detalles de la propiedad
      window.location.href = `property-details.html?slug=${property.slug}`;
    });
    
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evitar que se active el click de la tarjeta
      toggleFavoriteProperty(property.id, e);
    });
  });
  
  // Agregar contador y botón "Ver más" si se requiere paginación
  if (showPagination && totalProperties > PROPERTIES_PER_PAGE) {
    const showingCount = Math.min(currentPage * PROPERTIES_PER_PAGE, totalProperties);
    const hasMore = currentPage * PROPERTIES_PER_PAGE < totalProperties;
    
    // Crear contenedor fuera del grid para el botón
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'w-full col-span-full mt-8 text-center';
    
    paginationContainer.innerHTML = `
      <div class="mb-4">
        <p class="text-gray-600 text-sm">
          Mostrando ${showingCount} de ${totalProperties} propiedades
        </p>
      </div>
      ${hasMore ? `
        <button class="load-more-btn bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
          <span class="flex items-center justify-center">
            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ver más propiedades
          </span>
        </button>
      ` : ''}
    `;
    
    container.appendChild(paginationContainer);
    
    // Agregar event listener al botón "Ver más"
    const loadMoreBtn = paginationContainer.querySelector('.load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        loadMoreProperties(containerId, filteredProperties, currentPage + 1);
      });
    }
  }
}

function loadMoreProperties(containerId, allProperties, newPage) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Determinar qué página actualizar
  if (containerId === 'featuredProperties') {
    currentFeaturedPage = newPage;
  } else if (containerId === 'allProperties') {
    currentAllPropertiesPage = newPage;
  } else if (containerId === 'propertiesContainer') {
    currentSearchPage = newPage;
  }
  
  // Renderizar todas las propiedades hasta la página actual
  const startIndex = 0;
  const endIndex = newPage * PROPERTIES_PER_PAGE;
  const propertiesToShow = allProperties.slice(startIndex, endIndex);
  
  // Limpiar el contenedor y renderizar todas las propiedades hasta ahora
  container.innerHTML = '';
  propertiesToShow.forEach(property => {
    const card = document.createElement('div');
    card.className = 'property-card group cursor-pointer';
    card.innerHTML = `
      <div class="card-image relative overflow-hidden">
        <img src="${property.images?.[0] || 'https://via.placeholder.com/300x200'}"
             alt="${property.title}"
             class="w-full h-full object-cover transition duration-500 group-hover:scale-105"
             loading="lazy">
        <button class="favorite-btn ${isPropertyInFavorites(property.id) ? 'favorited' : ''} absolute top-3 right-3"
                data-property-id="${property.id}"
                aria-label="${isPropertyInFavorites(property.id) ? 'Remover de favoritos' : 'Añadir a favoritos'}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        ${property.featured ? '<div class="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">⭐ Destacada</div>' : ''}
      </div>
      <div class="card-content">
        <div class="card-body">
          <h4 class="text-lg font-montserrat font-semibold text-gray-800 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">${property.title}</h4>
          <div class="flex flex-wrap gap-2 mb-3">
            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">${property.type}</span>
            <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">${property.operation}</span>
            ${property.location ? `<span class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">${property.location}</span>` : ''}
          </div>
          <p class="text-xl font-bold text-gray-900 mb-3">${getCurrencySymbol(property.currency)}${property.price ? property.price.toLocaleString() : 'Consultar'}</p>
          <p class="text-gray-500 text-sm line-clamp-2 mb-4">${property.description || 'Sin descripción disponible'}</p>
          <div class="flex gap-3 text-sm text-gray-600 mb-4">
            ${property.bedrooms ? `<span class="flex items-center bg-blue-50 px-3 py-2 rounded-lg border border-blue-200"><i class="fas fa-bed text-blue-600 mr-2"></i><span class="font-medium text-blue-800">${property.bedrooms}</span></span>` : ''}
            ${property.bathrooms ? `<span class="flex items-center bg-green-50 px-3 py-2 rounded-lg border border-green-200"><i class="fas fa-bath text-green-600 mr-2"></i><span class="font-medium text-green-800">${property.bathrooms}</span></span>` : ''}
            ${property.squareMeters ? `<span class="flex items-center bg-purple-50 px-3 py-2 rounded-lg border border-purple-200"><i class="fas fa-ruler-combined text-purple-600 mr-2"></i><span class="font-medium text-purple-800">${property.squareMeters}m²</span></span>` : ''}
          </div>
        </div>
        <div class="card-footer">
          <div class="text-center py-2">
            <p class="text-gray-400 text-xs">
              <i class="fas fa-hand-pointer mr-1"></i>
              Haz click para ver detalles
            </p>
          </div>
        </div>
      </div>`;
    container.appendChild(card);
    
    // Hacer que toda la tarjeta sea clickeable
    card.addEventListener('click', (e) => {
      if (e.target.closest('.favorite-btn')) {
        return;
      }
      window.location.href = `property-details.html?slug=${property.slug}`;
    });
    
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavoriteProperty(property.id, e);
    });
  });
  
  // Agregar contador y botón actualizado
  const totalProperties = allProperties.length;
  const showingCount = Math.min(newPage * PROPERTIES_PER_PAGE, totalProperties);
  const hasMore = newPage * PROPERTIES_PER_PAGE < totalProperties;
  
  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'w-full col-span-full mt-8 text-center';
  
  paginationContainer.innerHTML = `
    <div class="mb-4">
      <p class="text-gray-600 text-sm">
        Mostrando ${showingCount} de ${totalProperties} propiedades
      </p>
    </div>
    ${hasMore ? `
      <button class="load-more-btn bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
        <span class="flex items-center justify-center">
          <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Ver más propiedades
        </span>
      </button>
    ` : ''}
  `;
  
  container.appendChild(paginationContainer);
  
  // Agregar event listener al nuevo botón
  const loadMoreBtn = paginationContainer.querySelector('.load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      loadMoreProperties(containerId, allProperties, newPage + 1);
    });
  }
}

function filterProperties() {
  if (!document.getElementById('searchInput')) {
    // Estamos en detalles o página que no tiene buscador
    renderProperties(properties.filter(p => p.featured), 'featuredProperties', true, currentFeaturedPage);
    renderProperties(properties.filter(p => !p.featured), 'allProperties', true, currentAllPropertiesPage);
    return;
  }

  let filtered = [...properties];
  const search = document.getElementById('searchInput')?.value.trim().toLowerCase();
  const operation = document.getElementById('operationFilter')?.value;
  const type = document.getElementById('typeFilter')?.value;
  const sort = document.getElementById('sortPrice')?.value;

  // Búsqueda mejorada que incluye más campos
  if (search) {
    filtered = filtered.filter(p => {
      const searchTerms = search.split(' ').filter(term => term.length > 0);
      return searchTerms.every(term => 
        p.title?.toLowerCase().includes(term) || 
        p.description?.toLowerCase().includes(term) ||
        p.location?.toLowerCase().includes(term) ||
        p.type?.toLowerCase().includes(term) ||
        p.operation?.toLowerCase().includes(term) ||
        p.owner?.toLowerCase().includes(term)
      );
    });
  }

  if (operation) {
    filtered = filtered.filter(p => p.operation === operation);
  }

  if (type) {
    filtered = filtered.filter(p => p.type === type);
  }

  // Ordenamiento mejorado
  if (sort === 'asc') {
    filtered.sort((a, b) => {
      const priceA = a.price || 0;
      const priceB = b.price || 0;
      if (priceA === 0 && priceB === 0) return 0;
      if (priceA === 0) return 1;
      if (priceB === 0) return -1;
      return priceA - priceB;
    });
  } else if (sort === 'desc') {
    filtered.sort((a, b) => {
      const priceA = a.price || 0;
      const priceB = b.price || 0;
      if (priceA === 0 && priceB === 0) return 0;
      if (priceA === 0) return 1;
      if (priceB === 0) return -1;
      return priceB - priceA;
    });
  }

  // Mostrar resultados de búsqueda o propiedades destacadas
  const hasActiveFilters = search || operation || type || sort;
  
  // Resetear páginas cuando hay filtros activos
  if (hasActiveFilters) {
    currentSearchPage = 1;
  } else {
    currentFeaturedPage = 1;
    currentAllPropertiesPage = 1;
  }
  
  if (hasActiveFilters) {
    document.getElementById('searchResultsHeader')?.classList.remove('hidden');
    document.getElementById('featuredSection')?.classList.add('hidden');
    document.getElementById('allPropertiesSection')?.classList.add('hidden');
    
    // Actualizar el texto del header con el número de resultados
    const header = document.getElementById('searchResultsHeader');
    if (header) {
      const h2 = header.querySelector('h2');
      if (h2) {
        h2.textContent = `Resultados de la búsqueda (${filtered.length} propiedades encontradas)`;
      }
    }
    
    // Mostrar mensaje de "sin resultados" si no hay propiedades
    if (filtered.length === 0) {
      document.getElementById('propertiesContainer')?.classList.add('hidden');
      document.getElementById('noResultsMessage')?.classList.remove('hidden');
    } else {
      document.getElementById('propertiesContainer')?.classList.remove('hidden');
      document.getElementById('noResultsMessage')?.classList.add('hidden');
      renderProperties(filtered, 'propertiesContainer', true, currentSearchPage);
    }
  } else {
    document.getElementById('searchResultsHeader')?.classList.add('hidden');
    document.getElementById('propertiesContainer')?.classList.add('hidden');
    document.getElementById('noResultsMessage')?.classList.add('hidden');
    document.getElementById('featuredSection')?.classList.remove('hidden');
    document.getElementById('allPropertiesSection')?.classList.remove('hidden');
    renderProperties(properties.filter(p => p.featured), 'featuredProperties', true, currentFeaturedPage);
    renderProperties(properties.filter(p => !p.featured), 'allProperties', true, currentAllPropertiesPage);
  }
}

// Función de debounce para optimizar la búsqueda
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Función para mostrar/ocultar indicador de carga
function showSearchLoading(show) {
  const loadingIndicator = document.getElementById('searchLoadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.classList.toggle('hidden', !show);
  }
}

// Crear versión con debounce de filterProperties que incluye indicador de carga
const debouncedFilterProperties = debounce(() => {
  showSearchLoading(true);
  setTimeout(() => {
    filterProperties();
    showSearchLoading(false);
  }, 100);
}, 300);

document.addEventListener('DOMContentLoaded', () => {
  loadPropertiesFromFirestore();
  document.getElementById('favoritesButton')?.addEventListener('click', showFavoritesModal);
  document.getElementById('clearFavoritesButton')?.addEventListener('click', clearFavorites);
  document.getElementById('closeFavoritesButton')?.addEventListener('click', closeFavoritesModal);
  document.getElementById('closeFavoritesButtonBottom')?.addEventListener('click', closeFavoritesModal);
  
  // Inicializar el estado de los favoritos
  setTimeout(() => {
    updateFavoritesCounter();
    updateAllFavoriteButtons();
  }, 1000);

  if (document.getElementById('searchInput')) {
    // Usar debouncedFilterProperties para el input de búsqueda
    document.getElementById('searchInput').addEventListener('input', debouncedFilterProperties);
    document.getElementById('operationFilter').addEventListener('change', filterProperties);
    document.getElementById('typeFilter').addEventListener('change', filterProperties);
    document.getElementById('sortPrice').addEventListener('change', filterProperties);
    document.getElementById('clearFiltersButton')?.addEventListener('click', clearSearchFilters);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      favoriteProperties = JSON.parse(localStorage.getItem('favoriteProperties')) || [];
      updateFavoritesCounter();
      filterProperties();
    }
  });
});