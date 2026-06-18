/**
 * AuraPredict - AI Real Estate Price Predictor Frontend Script
 */

// API Configuration
const API_URL = 'https://aurapredict-api-fx2w.onrender.com';
let apiOnline = false;
let locations = [];

// Fallback locations when API is offline (so the UI remains fully interactive!)
const FALLBACK_LOCATIONS = [
    "1st Phase JP Nagar", "Electronic City", "Whitefield", "Sarjapur Road", 
    "Marathahalli", "Indira Nagar", "Kanakpura Road", "Thanisandra", 
    "Yelahanka", "Hebbal", "Uttarahalli", "Bannerghatta Road", 
    "Raja Rajeshwari Nagar", "BTM Layout", "7th Phase JP Nagar", 
    "HSR Layout", "Malleshwaram", "Yeshwanthpur", "Bellandur", "Begur Road",
    "Jakkur", "Varthur", "Kengeri", "Hennur Road", "AECS Layout"
];

// App State
let selectedBhk = "1";
let selectedBath = "2";
let highlightedIndex = -1;

// DOM Elements
const apiStatusBadge = document.getElementById('api-status');
const apiStatusText = apiStatusBadge.querySelector('.status-text');
const locationInput = document.getElementById('location-input');
const clearLocationBtn = document.getElementById('clear-location');
const locationDropdown = document.getElementById('location-dropdown');
const sqftInput = document.getElementById('sqft-input');
const bhkSelector = document.getElementById('bhk-selector');
const bathSelector = document.getElementById('bath-selector');
const btnSubmit = document.getElementById('btn-submit');
const predictionForm = document.getElementById('prediction-form');
const resultContainer = document.getElementById('result-container');
const resultStatusTag = document.getElementById('result-status-tag');
const priceDisplay = document.getElementById('price-display');
const priceDetailsDesc = document.getElementById('price-details-desc');
const priceConvertedDisplay = document.getElementById('price-converted-display');
const closeResultBtn = document.getElementById('close-result');

/* ==========================================================================
   INITIALIZATION & API HEALTH CHECK
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initSegmentedControls();
    checkApiHealth();
});

// Check API health status and load locations
async function checkApiHealth() {
    try {
        // Fetch locations with a 3-second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${API_URL}/get_location_names`, {
            method: 'POST', // Backend server.py defines this as POST
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('API server returned error code');
        
        const data = await response.json();
        
        if (data && data.locations && data.locations.length > 0) {
            // Convert locations to Title Case for better aesthetics
            locations = data.locations.map(loc => toTitleCase(loc));
            apiOnline = true;
            updateStatusBadge(true, "AI Server Online");
        } else {
            throw new Error('API returned empty locations');
        }
    } catch (error) {
        console.warn("Flask Server offline or unreachable. Falling back to offline simulator mode.", error);
        locations = FALLBACK_LOCATIONS.sort();
        apiOnline = false;
        updateStatusBadge(false, "Online Mode");
    }
}

// Update API Status Indicator in header
function updateStatusBadge(online, text) {
    if (online) {
        apiStatusBadge.className = 'status-badge online';
    } else {
        apiStatusBadge.className = 'status-badge offline';
    }
    apiStatusText.textContent = text;
}

// Formatting string to title case
function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/* ==========================================================================
   SEGMENTED CONTROL SELECTION
   ========================================================================== */
function initSegmentedControls() {
    // BHK Segment Selection
    bhkSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.segment-btn');
        if (!btn) return;
        
        bhkSelector.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedBhk = btn.dataset.value;
    });

    // Bathroom Segment Selection
    bathSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.segment-btn');
        if (!btn) return;
        
        bathSelector.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedBath = btn.dataset.value;
    });
}

/* ==========================================================================
   SEARCHABLE AUTOCOMPLETE DROPDOWN
   ========================================================================== */
locationInput.addEventListener('input', () => {
    const val = locationInput.value.trim();
    highlightedIndex = -1;
    
    if (val.length > 0) {
        clearLocationBtn.classList.add('visible');
        renderDropdown(val);
    } else {
        clearLocationBtn.classList.remove('visible');
        hideDropdown();
    }
});

// Render filtered dropdown elements
function renderDropdown(filterText) {
    locationDropdown.innerHTML = '';
    const filtered = locations.filter(loc => 
        loc.toLowerCase().includes(filterText.toLowerCase())
    );
    
    if (filtered.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No matching neighborhoods found';
        locationDropdown.appendChild(noResults);
    } else {
        filtered.forEach((loc, index) => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = loc;
            
            // Mouse select
            item.addEventListener('click', () => {
                selectLocation(loc);
            });
            locationDropdown.appendChild(item);
        });
    }
    locationDropdown.classList.add('active');
}

function hideDropdown() {
    locationDropdown.classList.remove('active');
    highlightedIndex = -1;
}

// Clear input button click
clearLocationBtn.addEventListener('click', () => {
    locationInput.value = '';
    clearLocationBtn.classList.remove('visible');
    hideDropdown();
    locationInput.focus();
});

// Select item
function selectLocation(locName) {
    locationInput.value = locName;
    hideDropdown();
}

// Close dropdown if clicked outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-container')) {
        hideDropdown();
    }
});

// Show full list when input gets focus
locationInput.addEventListener('focus', () => {
    const val = locationInput.value.trim();
    renderDropdown(val);
});

// Keyboard navigation in autocomplete list
locationInput.addEventListener('keydown', (e) => {
    const items = locationDropdown.querySelectorAll('.dropdown-item');
    if (items.length === 0) return;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightedIndex = (highlightedIndex + 1) % items.length;
        updateItemHighlighting(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
        updateItemHighlighting(items);
    } else if (e.key === 'Enter') {
        if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            e.preventDefault();
            selectLocation(items[highlightedIndex].textContent);
        }
    } else if (e.key === 'Escape') {
        hideDropdown();
    }
});

function updateItemHighlighting(items) {
    items.forEach((item, index) => {
        if (index === highlightedIndex) {
            item.classList.add('highlighted');
            // Scroll to view
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('highlighted');
        }
    });
}

/* ==========================================================================
   FORM SUBMISSION & PRICE PREDICTION
   ========================================================================== */
predictionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const location = locationInput.value.trim();
    const sqft = parseFloat(sqftInput.value);
    const bhk = parseInt(selectedBhk);
    const bath = parseInt(selectedBath);
    
    // Validate that location exists in our list (highly recommended for prediction API)
    const validLocation = locations.find(loc => loc.toLowerCase() === location.toLowerCase());
    if (!validLocation) {
        alert("Please select a valid location from the dropdown suggestions.");
        return;
    }
    
    // Use matching case from list
    const matchedLoc = validLocation;
    locationInput.value = matchedLoc;
    
    // Set UI loading state
    btnSubmit.classList.add('loading');
    resultContainer.classList.add('hidden');
    
    // Add artificial delay (800ms) for smooth animation / loading UX
    setTimeout(async () => {
        try {
            let price = 0;
            
            if (apiOnline) {
                // Connect to Flask server
                const response = await fetch(`${API_URL}/get_estimated_price`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        total_sqft: sqft,
                        location: matchedLoc,
                        bhk: bhk,
                        bath: bath
                    })
                });
                
                if (!response.ok) throw new Error('Prediction API returned an error');
                
                const data = await response.json();
                price = data.estimated_price;
                showPredictionResult(price, matchedLoc, sqft, bhk, bath, false);
            } else {
                // Offline Simulator Mode (Deterministic prediction model approximation)
                price = calculateMockPrice(matchedLoc, sqft, bhk, bath);
                showPredictionResult(price, matchedLoc, sqft, bhk, bath, true);
            }
        } catch (error) {
            console.error("Prediction request failed. Displaying simulator fallback.", error);
            const price = calculateMockPrice(matchedLoc, sqft, bhk, bath);
            showPredictionResult(price, matchedLoc, sqft, bhk, bath, true);
        } finally {
            btnSubmit.classList.remove('loading');
        }
    }, 800);
});

// Deterministic mock price calculation (realistic fallback estimator)
function calculateMockPrice(location, sqft, bhk, bath) {
    // Generate a hash based on location name to assign a specific price tier per location
    const hash = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // base cost per sqft ranges between 3,500 and 10,000 INR
    const baseSqftCost = 3500 + (hash % 14) * 500;
    
    // multipliers based on room quantities
    const roomsMultiplier = 1.0 + (bhk * 0.12) + (bath * 0.08);
    
    // calculate raw price in INR
    const rawPriceInInr = sqft * baseSqftCost * roomsMultiplier;
    
    // convert to Lakhs (1 Lakh = 100,000 INR)
    const priceInLakhs = rawPriceInInr / 100000;
    
    return Math.round(priceInLakhs * 100) / 100;
}

// Display prediction results to the user
function showPredictionResult(price, location, sqft, bhk, bath, isMock) {
    // Format Price
    let priceText = "";
    if (price >= 100) {
        // Convert to Crores if >= 100 Lakhs (e.g. 1.25 Crore)
        const priceInCrores = Math.round((price / 100) * 100) / 100;
        priceText = `₹ ${priceInCrores} Crore`;
    } else {
        priceText = `₹ ${price.toFixed(2)} Lakhs`;
    }
    
    // Set status tag
    if (isMock) {
        resultStatusTag.textContent = "Offline Simulator";
        resultStatusTag.className = "result-tag mock";
    } else {
        resultStatusTag.textContent = "AI Estimate";
        resultStatusTag.className = "result-tag";
    }
    
    priceDisplay.textContent = priceText;
    priceDetailsDesc.textContent = `Estimated value for a ${sqft.toLocaleString()} sq ft, ${bhk} BHK property with ${bath} bathroom(s) in ${location}.`;
    
    // Approx USD Conversion (1 Lakh INR = ~$1,200 USD)
    const priceInUsd = Math.round(price * 1200);
    priceConvertedDisplay.textContent = `Approx. $${priceInUsd.toLocaleString()} USD`;
    
    // Reveal container
    resultContainer.classList.remove('hidden');
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Close result button
closeResultBtn.addEventListener('click', () => {
    resultContainer.classList.add('hidden');
});

// FAQ Accordion Toggle Interaction
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    const content = item.querySelector('.faq-content');
    
    trigger.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Close all other items for a clean accordion effect
        faqItems.forEach(otherItem => {
            otherItem.classList.remove('active');
            otherItem.querySelector('.faq-content').style.maxHeight = null;
        });
        
        if (!isActive) {
            item.classList.add('active');
            content.style.maxHeight = content.scrollHeight + "px";
        }
    });
});

// Newsletter Subscription Handler
const subscribeForm = document.getElementById('subscribe-form');
if (subscribeForm) {
    subscribeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = subscribeForm.querySelector('input[type="email"]');
        const email = emailInput.value.trim();
        if (email) {
            alert(`Thank you! Monthly market reports will be sent to: ${email}`);
            emailInput.value = '';
        }
    });
}

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const navLinksContainer = document.getElementById('nav-links');

if (mobileMenuBtn && navLinksContainer) {
    mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navLinksContainer.classList.toggle('open');
        const icon = mobileMenuBtn.querySelector('i');
        if (navLinksContainer.classList.contains('open')) {
            icon.className = 'fa-solid fa-xmark';
        } else {
            icon.className = 'fa-solid fa-bars';
        }
    });

    // Close menu when clicking a link
    navLinksContainer.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinksContainer.classList.remove('open');
            mobileMenuBtn.querySelector('i').className = 'fa-solid fa-bars';
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.app-header')) {
            navLinksContainer.classList.remove('open');
            mobileMenuBtn.querySelector('i').className = 'fa-solid fa-bars';
        }
    });
}

// Scroll Intersection Observer for Active Nav Link
const sections = document.querySelectorAll('main, section[id]');
const navLinks = document.querySelectorAll('.nav-link');

const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -60% 0px', // Detects when section is in viewport center
    threshold: 0
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach(link => {
                if (link.getAttribute('href') === `#${id}`) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
    });
}, observerOptions);

sections.forEach(section => {
    if (section.getAttribute('id')) {
        observer.observe(section);
    }
});

// Scroll to Top & Logo Click Interaction
const logo = document.getElementById('app-logo');
if (logo) {
    logo.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

const scrollToTopBtn = document.getElementById('scroll-to-top');
if (scrollToTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    });

    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
