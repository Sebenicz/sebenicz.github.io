document.addEventListener('DOMContentLoaded', () => {
  // --- GOOGLE SHEETS CONCERT FETCHING (CORS-FREE VIA JSONP) ---
  
  // Pre-populated fallback data with the 3 concerts from the sheet in case of network issues
  const FALLBACK_CONCERTS = [
    {
      Date: '12.06.2026',
      Name: 'Piwnica Kany',
      City: 'Szczecin',
      Link: 'https://www.facebook.com/events/1658406402602202'
    },
    {
      Date: '20.06.2026',
      Name: 'Metalowa KUPALNOCKA',
      City: 'Połczyn-Zdrój',
      Link: 'https://www.facebook.com/events/2322248678185824'
    },
    {
      Date: '26.06.2026',
      Name: 'Beer&Bones',
      City: 'Warszawa',
      Link: 'https://www.facebook.com/events/1889354978394467'
    }
  ];

  const concertListEl = document.getElementById('concert-list');

  // Define the global response handler for JSONP
  window.handleGoogleSheetResponse = function(response) {
    try {
      if (!response || response.status !== 'ok' || !response.table || !response.table.rows) {
        throw new Error('Invalid JSONP format');
      }
      
      const cols = response.table.cols;
      const rows = response.table.rows;
      
      // Parse columns to objects based on their labels (Date, Name, City, Link)
      const concerts = rows.map(row => {
        const gig = {};
        cols.forEach((col, idx) => {
          const cell = row.c[idx];
          // cell.f is the formatted value (e.g. DD.MM.YYYY), cell.v is the raw value
          const value = cell ? (cell.f || cell.v || '') : '';
          gig[col.label] = value;
        });
        return gig;
      });
      
      renderConcerts(concerts);
    } catch (error) {
      console.warn('Could not parse live concerts JSONP, using fallback data:', error);
      renderConcerts(FALLBACK_CONCERTS);
    }
  };

  // Load concerts dynamically using script insertion (bypasses CORS)
  fetchConcertsJSONP();

  function fetchConcertsJSONP() {
    const script = document.createElement('script');
    script.src = 'https://docs.google.com/spreadsheets/d/1z9Vns0_yU0FFwhXdhh2AiU12_GSPm5KOEs6UWQMwS1w/gviz/tq?tqx=responseHandler:handleGoogleSheetResponse';
    script.id = 'jsonp-concerts-script';
    
    script.onerror = () => {
      console.warn('JSONP loading failed (possibly offline), using fallback data');
      renderConcerts(FALLBACK_CONCERTS);
    };
    
    // Clean up old script element if it exists
    const oldScript = document.getElementById('jsonp-concerts-script');
    if (oldScript) {
      oldScript.remove();
    }
    
    document.body.appendChild(script);
  }


  function renderConcerts(concerts) {
    if (!concertListEl) return;
    
    // Filter out invalid records (must have a date and name)
    const validConcerts = concerts.filter(c => c.Date && c.Name);
    
    if (validConcerts.length === 0) {
      concertListEl.innerHTML = '<div class="no-concerts">Brak zaplanowanych koncertów. Sprawdź wkrótce!</div>';
      return;
    }

    // Sort concerts chronologically (soonest first)
    // Date format expected: DD.MM.YYYY
    validConcerts.sort((a, b) => {
      try {
        const parseDate = (dStr) => {
          const parts = dStr.split('.');
          if (parts.length === 3) {
            // Day, Month, Year (0-indexed month)
            return new Date(parts[2], parts[1] - 1, parts[0]);
          }
          return new Date(0);
        };
        return parseDate(a.Date) - parseDate(b.Date);
      } catch (e) {
        return 0;
      }
    });

    // Clear loading text
    concertListEl.innerHTML = '';

    validConcerts.forEach(c => {
      const row = document.createElement('div');
      row.className = 'concert-row';

      // Date elements (extract DD.MM from DD.MM.YYYY if possible)
      let displayDate = c.Date;
      const dateParts = c.Date.split('.');
      if (dateParts.length >= 2) {
        displayDate = `${dateParts[0]}.${dateParts[1]}`;
      }

      // Action button
      let btnHtml = '';
      if (c.Link) {
        const btnLabel = 'Link';
        btnHtml = `<a href="${c.Link}" target="_blank" rel="noopener noreferrer" class="concert-btn">${btnLabel}</a>`;
      } else {
        btnHtml = `<span class="concert-btn" style="opacity: 0.5; border-style: dashed; cursor: default;">WKRÓTCE</span>`;
      }

      row.innerHTML = `
        <div class="concert-date-badge">${displayDate}</div>
        <div class="concert-info">
          <div class="concert-name">${escapeHTML(c.Name)}</div>
          <div class="concert-location"><span>${escapeHTML(c.City)}</span></div>
        </div>
        ${btnHtml}
      `;
      concertListEl.appendChild(row);
    });
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }


  // --- INTERACTIVE POLAROID DECK ---
  const polaroids = document.querySelectorAll('.polaroid-card');
  let highestZ = polaroids.length;
  let isAnimating = false;

  // Initialize Polaroid rotation & Z-indices
  polaroids.forEach((card, index) => {
    // Top card is the first one in DOM, z-index counts down
    const zIndex = polaroids.length - index;
    card.style.zIndex = zIndex;
    
    // Assign a random rotation between -8deg and +8deg
    const randomRot = (Math.random() * 16) - 8;
    card.style.transform = `rotate(${randomRot}deg) translate(0, 0)`;
    card.dataset.initRotation = randomRot;

    // Click/Touch events
    card.addEventListener('click', () => {
      if (isAnimating) return;
      
      const currentZ = parseInt(card.style.zIndex);
      
      // Only throw the top card
      if (currentZ === highestZ) {
        throwPolaroid(card);
      }
    });
  });

  function throwPolaroid(card) {
    isAnimating = true;
    card.classList.add('throwing');

    // After animation peaks (card is thrown to the side)
    setTimeout(() => {
      // Send card to bottom of the stack
      const lowestZ = highestZ - polaroids.length + 1;
      card.style.zIndex = lowestZ;
      
      // Shift all other card z-indices up by 1
      polaroids.forEach(otherCard => {
        if (otherCard !== card) {
          const z = parseInt(otherCard.style.zIndex);
          otherCard.style.zIndex = z + 1;
        }
      });
      
      // Rotate the card a bit differently when returned to stack
      const newRot = (Math.random() * 16) - 8;
      card.style.transform = `rotate(${newRot}deg) translate(0, 0)`;
      card.dataset.initRotation = newRot;

      // Bring card back into pile under everyone
      card.classList.remove('throwing');
      
      // Allow clicking again after animation finishes completely
      setTimeout(() => {
        isAnimating = false;
      }, 200);

    }, 250); // Matches the midpoint of CSS transition
  }
});
