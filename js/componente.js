/**
 * SwingDateTimePicker - Componente Visual Reutilizable en Vanilla JS
 * Versión completa con:
 * 1. Selector rápido de Mes y Décadas/Años
 * 2. Reloj Analógico Interactivo con manecilla
 * 3. Selector de Rango de Fechas (Start & End)
 */
class SwingDateTimePicker {
  constructor(inputSelector, options = {}) {
    this.input = typeof inputSelector === 'string'
      ? document.querySelector(inputSelector)
      : inputSelector;

    if (!this.input) {
      console.error(`SwingDateTimePicker: Elemento "${inputSelector}" no encontrado.`);
      return;
    }

    // Configuración
    this.options = {
      enableTime: options.enableTime || false,
      range: options.range || false, // Modo rango de fechas
      theme: options.theme || 'light', // 'light' | 'dark'
      format: options.format || (options.range ? 'YYYY-MM-DD a YYYY-MM-DD' : (options.enableTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD')),
      minDate: options.minDate ? new Date(options.minDate) : null,
      maxDate: options.maxDate ? new Date(options.maxDate) : null,
      onSelect: options.onSelect || null,
      ...options
    };

    // Estado interno
    this.currentView = 'calendar'; // 'calendar' | 'months' | 'years'
    this.activeTab = 'date'; // 'date' | 'time'
    this.clockMode = 'hours'; // 'hours' | 'minutes'

    const now = new Date();
    this.currentViewDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.yearDecadeStart = Math.floor(now.getFullYear() / 12) * 12;

    // Fechas seleccionadas
    this.startDate = null;
    this.endDate = null;
    this.hoverDate = null;

    // Hora (reloj analógico)
    this.selectedHour = 10;
    this.selectedMinute = 30;
    this.isPM = false;

    this.isOpen = false;
    this.pickerEl = null;

    this.monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    this.dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

    this._init();
  }

  _init() {
    this._buildDOM();
    this._bindEvents();
    this._renderView();
  }

  _buildDOM() {
    this.pickerEl = document.createElement('div');
    this.pickerEl.className = 'swing-dtp';
    this.pickerEl.setAttribute('data-theme', this.options.theme);

    let tabsHtml = '';
    if (this.options.enableTime && !this.options.range) {
      tabsHtml = `
        <div class="swing-dtp-tabs">
          <button type="button" class="swing-dtp-tab active js-tab-date">📅 Fecha</button>
          <button type="button" class="swing-dtp-tab js-tab-time">🕒 Hora</button>
        </div>
      `;
    }

    this.pickerEl.innerHTML = `
      ${tabsHtml}
      <!-- Contenedor Fecha (Calendario / Meses / Años) -->
      <div class="js-date-panel">
        <div class="swing-dtp-header">
          <button type="button" class="swing-dtp-nav-btn js-btn-prev">&larr;</button>
          <button type="button" class="swing-dtp-title-btn js-btn-title"></button>
          <button type="button" class="swing-dtp-nav-btn js-btn-next">&rarr;</button>
        </div>
        <div class="swing-dtp-view js-view-container"></div>
      </div>

      <!-- Contenedor Hora (Reloj Analógico) -->
      <div class="js-time-panel" style="display: none;">
        <div class="swing-dtp-clock-container">
          <div class="swing-dtp-clock-header">
            <span class="swing-dtp-time-unit active js-unit-hour">10</span>
            <span>:</span>
            <span class="swing-dtp-time-unit js-unit-min">30</span>
            <button type="button" class="swing-dtp-ampm-btn js-btn-ampm">AM</button>
          </div>

          <div class="swing-dtp-clock-face js-clock-face">
            <div class="swing-dtp-clock-center"></div>
            <div class="swing-dtp-clock-hand js-clock-hand">
              <div class="swing-dtp-clock-pointer"></div>
            </div>
            <div class="js-clock-numbers"></div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="swing-dtp-footer">
        <button type="button" class="swing-dtp-btn swing-dtp-btn-clear js-btn-clear">Limpiar</button>
        <button type="button" class="swing-dtp-btn swing-dtp-btn-apply js-btn-apply">Aplicar</button>
      </div>
    `;

    document.body.appendChild(this.pickerEl);

    // Guardar referencias a nodos
    this.titleBtn = this.pickerEl.querySelector('.js-btn-title');
    this.viewContainer = this.pickerEl.querySelector('.js-view-container');
    this.datePanel = this.pickerEl.querySelector('.js-date-panel');
    this.timePanel = this.pickerEl.querySelector('.js-time-panel');
  }

  _bindEvents() {
    this.input.addEventListener('focus', () => this.open());
    this.input.addEventListener('click', (e) => {
      e.stopPropagation();
      this.open();
    });

    // Pestañas Fecha / Hora
    if (this.options.enableTime && !this.options.range) {
      const tabDate = this.pickerEl.querySelector('.js-tab-date');
      const tabTime = this.pickerEl.querySelector('.js-tab-time');

      tabDate.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeTab = 'date';
        tabDate.classList.add('active');
        tabTime.classList.remove('active');
        this.datePanel.style.display = 'block';
        this.timePanel.style.display = 'none';
      });

      tabTime.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeTab = 'time';
        tabTime.classList.add('active');
        tabDate.classList.remove('active');
        this.datePanel.style.display = 'none';
        this.timePanel.style.display = 'block';
        this._renderClock();
      });
    }

    // Título central: cambia vista (Calendario -> Meses -> Años)
    this.titleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.currentView === 'calendar') {
        this.currentView = 'months';
      } else if (this.currentView === 'months') {
        this.currentView = 'years';
      }
      this._renderView();
    });

    // Botones Anterior / Siguiente
    this.pickerEl.querySelector('.js-btn-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.currentView === 'calendar') {
        this.currentViewDate.setMonth(this.currentViewDate.getMonth() - 1);
      } else if (this.currentView === 'months') {
        this.currentViewDate.setFullYear(this.currentViewDate.getFullYear() - 1);
      } else if (this.currentView === 'years') {
        this.yearDecadeStart -= 12;
      }
      this._renderView();
    });

    this.pickerEl.querySelector('.js-btn-next').addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.currentView === 'calendar') {
        this.currentViewDate.setMonth(this.currentViewDate.getMonth() + 1);
      } else if (this.currentView === 'months') {
        this.currentViewDate.setFullYear(this.currentViewDate.getFullYear() + 1);
      } else if (this.currentView === 'years') {
        this.yearDecadeStart += 12;
      }
      this._renderView();
    });

    // Eventos del reloj analógico
    if (this.options.enableTime) {
      const unitHour = this.pickerEl.querySelector('.js-unit-hour');
      const unitMin = this.pickerEl.querySelector('.js-unit-min');
      const btnAmpm = this.pickerEl.querySelector('.js-btn-ampm');
      const clockFace = this.pickerEl.querySelector('.js-clock-face');

      unitHour.addEventListener('click', () => {
        this.clockMode = 'hours';
        unitHour.classList.add('active');
        unitMin.classList.remove('active');
        this._renderClock();
      });

      unitMin.addEventListener('click', () => {
        this.clockMode = 'minutes';
        unitMin.classList.add('active');
        unitHour.classList.remove('active');
        this._renderClock();
      });

      btnAmpm.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isPM = !this.isPM;
        btnAmpm.textContent = this.isPM ? 'PM' : 'AM';
        this._updateValue();
      });

      // Clic o arrastre en la esfera del reloj
      const handleClockInput = (e) => {
        const rect = clockFace.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - (rect.left + rect.width / 2);
        const y = clientY - (rect.top + rect.height / 2);

        let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;

        if (this.clockMode === 'hours') {
          let h = Math.round(angle / 30);
          if (h === 0) h = 12;
          this.selectedHour = h;
          unitHour.textContent = String(h).padStart(2, '0');
          this._updateClockHand(h * 30);
          // Al seleccionar hora, pasa a minutos automáticamente como en Raven Picker
          setTimeout(() => unitMin.click(), 250);
        } else {
          let m = Math.round(angle / 6) % 60;
          this.selectedMinute = m;
          unitMin.textContent = String(m).padStart(2, '0');
          this._updateClockHand(m * 6);
        }
        this._updateValue();
      };

      clockFace.addEventListener('mousedown', (e) => {
        handleClockInput(e);
        const onMouseMove = (ev) => handleClockInput(ev);
        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    }

    // Botones de acción
    this.pickerEl.querySelector('.js-btn-clear').addEventListener('click', (e) => {
      e.stopPropagation();
      this.clear();
      this.close();
    });

    this.pickerEl.querySelector('.js-btn-apply').addEventListener('click', (e) => {
      e.stopPropagation();
      this._updateValue();
      this.close();
    });

    // Cerrar al dar clic fuera
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.pickerEl.contains(e.target) && e.target !== this.input) {
        this.close();
      }
    });

    window.addEventListener('resize', () => {
      if (this.isOpen) this._positionPicker();
    });
  }

  _renderView() {
    if (this.currentView === 'calendar') {
      this._renderCalendarDays();
    } else if (this.currentView === 'months') {
      this._renderMonthGrid();
    } else if (this.currentView === 'years') {
      this._renderYearGrid();
    }
  }

  // 1. Vista Cuadrícula de Años (Década)
  _renderYearGrid() {
    const startYear = this.yearDecadeStart;
    const endYear = startYear + 11;
    this.titleBtn.textContent = `${startYear} - ${endYear}`;

    let html = '<div class="swing-dtp-grid-view">';
    for (let y = startYear; y <= endYear; y++) {
      const isSelected = this.startDate && this.startDate.getFullYear() === y;
      html += `
        <button type="button" class="swing-dtp-grid-item ${isSelected ? 'is-selected' : ''}" data-year="${y}">
          ${y}
        </button>
      `;
    }
    html += '</div>';

    this.viewContainer.innerHTML = html;

    this.viewContainer.querySelectorAll('.swing-dtp-grid-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedYear = parseInt(btn.dataset.year, 10);
        this.currentViewDate.setFullYear(selectedYear);
        this.currentView = 'months'; // Salta a meses
        this._renderView();
      });
    });
  }

  // 2. Vista Cuadrícula de Meses
  _renderMonthGrid() {
    const year = this.currentViewDate.getFullYear();
    this.titleBtn.textContent = `${year}`;

    let html = '<div class="swing-dtp-grid-view">';
    this.monthNames.forEach((month, idx) => {
      const isSelected = this.startDate && this.startDate.getMonth() === idx && this.startDate.getFullYear() === year;
      html += `
        <button type="button" class="swing-dtp-grid-item ${isSelected ? 'is-selected' : ''}" data-month="${idx}">
          ${month.substring(0, 3)}
        </button>
      `;
    });
    html += '</div>';

    this.viewContainer.innerHTML = html;

    this.viewContainer.querySelectorAll('.swing-dtp-grid-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedMonth = parseInt(btn.dataset.month, 10);
        this.currentViewDate.setMonth(selectedMonth);
        this.currentView = 'calendar'; // Salta a días
        this._renderView();
      });
    });
  }

  // 3. Vista Días (Calendario + Selección de Rango)
  // 3. Vista Días (Calendario + Selección de Rango Corregida)
  _renderCalendarDays() {
    const year = this.currentViewDate.getFullYear();
    const month = this.currentViewDate.getMonth();
    this.titleBtn.textContent = `${this.monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = `
      <div class="swing-dtp-weekdays">
        ${this.dayNames.map(d => `<span>${d}</span>`).join('')}
      </div>
      <div class="swing-dtp-days js-days-grid"></div>
    `;
    this.viewContainer.innerHTML = html;

    const daysGrid = this.viewContainer.querySelector('.js-days-grid');

    // Días vacíos iniciales
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'swing-dtp-day is-empty';
      daysGrid.appendChild(emptyDiv);
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const dayBtn = document.createElement('button');
      dayBtn.type = 'button';
      dayBtn.className = 'swing-dtp-day';
      dayBtn.textContent = day;

      const currentDate = new Date(year, month, day);
      currentDate.setHours(0, 0, 0, 0);
      const currentTime = currentDate.getTime();

      // Guardamos la marca de tiempo en el botón
      dayBtn.dataset.time = currentTime;

      if (currentTime === today.getTime()) {
        dayBtn.classList.add('is-today');
      }

      // Marcado visual de fechas ya seleccionadas
      if (this.options.range) {
        const startTime = this.startDate ? this.startDate.getTime() : null;
        const endTime = this.endDate ? this.endDate.getTime() : null;

        if (startTime && currentTime === startTime) {
          dayBtn.classList.add('is-range-start');
        }
        if (endTime && currentTime === endTime) {
          dayBtn.classList.add('is-range-end');
        }
        if (startTime && endTime && currentTime > startTime && currentTime < endTime) {
          dayBtn.classList.add('is-in-range');
        }

        // Efecto hover rápido SIN destruir el DOM
        dayBtn.addEventListener('mouseenter', () => {
          if (this.startDate && !this.endDate) {
            this._highlightRangePreview(currentTime);
          }
        });
      } else {
        if (this.startDate && currentTime === this.startDate.getTime()) {
          dayBtn.classList.add('is-selected');
        }
      }

      // Clic para seleccionar inicio o fin
      dayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._handleDayClick(new Date(year, month, day, 0, 0, 0));
      });

      daysGrid.appendChild(dayBtn);
    }
  }

  // Efecto visual al pasar el cursor (sin recargar el HTML)
  _highlightRangePreview(hoverTime) {
    const startTime = this.startDate.getTime();
    const buttons = this.viewContainer.querySelectorAll('.swing-dtp-day[data-time]');

    buttons.forEach(btn => {
      const btnTime = Number(btn.dataset.time);
      const isBetween = (btnTime > startTime && btnTime <= hoverTime) || 
                        (btnTime < startTime && btnTime >= hoverTime);

      btn.classList.toggle('is-in-range', isBetween);
    });
  }

  // Manejo de los 2 clics para el rango
  _handleDayClick(date) {
    date.setHours(0, 0, 0, 0);

    if (this.options.range) {
      if (!this.startDate || (this.startDate && this.endDate)) {
        // PRIMER CLIC: define fecha de inicio y reinicia la fecha de fin
        this.startDate = date;
        this.endDate = null;
      } else if (this.startDate && !this.endDate) {
        // SEGUNDO CLIC: define fecha de fin
        if (date.getTime() < this.startDate.getTime()) {
          // Si el usuario hizo clic en una fecha anterior, se invierten
          this.endDate = this.startDate;
          this.startDate = date;
        } else {
          this.endDate = date;
        }
      }
      
      this._renderCalendarDays();
      this._updateValue();
    } else {
      this.startDate = date;
      this._renderCalendarDays();
      this._updateValue();
      if (!this.options.enableTime) {
        this.close();
      }
    }
  }

  // 4. Reloj Analógico Interactivo
  _renderClock() {
    const numbersContainer = this.pickerEl.querySelector('.js-clock-numbers');
    numbersContainer.innerHTML = '';

    const radius = 82; // Radio de la esfera
    const isHours = this.clockMode === 'hours';
    const total = isHours ? 12 : 12;

    for (let i = 1; i <= total; i++) {
      const val = isHours ? i : (i % 12) * 5;
      const displayVal = isHours ? val : String(val).padStart(2, '0');
      const angle = (i * 30) * (Math.PI / 180);

      const x = 110 + radius * Math.sin(angle);
      const y = 110 - radius * Math.cos(angle);

      const numEl = document.createElement('span');
      numEl.className = 'swing-dtp-clock-number';
      numEl.textContent = displayVal;
      numEl.style.left = `${x}px`;
      numEl.style.top = `${y}px`;

      const currentVal = isHours ? this.selectedHour : this.selectedMinute;
      if (val === currentVal) {
        numEl.classList.add('active');
      }

      numbersContainer.appendChild(numEl);
    }

    const angle = isHours ? (this.selectedHour % 12) * 30 : this.selectedMinute * 6;
    this._updateClockHand(angle);
  }

  _updateClockHand(deg) {
    const hand = this.pickerEl.querySelector('.js-clock-hand');
    if (hand) hand.style.transform = `rotate(${deg}deg)`;
  }

  _isSameDate(d1, d2) {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  _formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  _updateValue() {
    if (this.options.range) {
      if (this.startDate && this.endDate) {
        const text = `${this._formatDate(this.startDate)} a ${this._formatDate(this.endDate)}`;
        this.input.value = text;
        if (typeof this.options.onSelect === 'function') {
          this.options.onSelect({ start: this.startDate, end: this.endDate }, text);
        }
      } else if (this.startDate) {
        this.input.value = `${this._formatDate(this.startDate)} a ...`;
      }
    } else if (this.startDate) {
      let resultDate = new Date(this.startDate);
      let hours = this.selectedHour;
      if (this.isPM && hours < 12) hours += 12;
      if (!this.isPM && hours === 12) hours = 0;
      resultDate.setHours(hours, this.selectedMinute, 0);

      const yyyy = resultDate.getFullYear();
      const mm = String(resultDate.getMonth() + 1).padStart(2, '0');
      const dd = String(resultDate.getDate()).padStart(2, '0');
      const hh = String(hours).padStart(2, '0');
      const min = String(this.selectedMinute).padStart(2, '0');

      let formatted = this.options.format
        .replace('YYYY', yyyy)
        .replace('MM', mm)
        .replace('DD', dd)
        .replace('HH', hh)
        .replace('mm', min);

      this.input.value = formatted;

      if (typeof this.options.onSelect === 'function') {
        this.options.onSelect(resultDate, formatted);
      }
    }
  }

  _positionPicker() {
    const rect = this.input.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    let top = rect.bottom + scrollTop + 6;
    let left = rect.left + scrollLeft;

    if (left + 330 > window.innerWidth) {
      left = window.innerWidth - 340;
    }

    this.pickerEl.style.top = `${top}px`;
    this.pickerEl.style.left = `${Math.max(10, left)}px`;
  }

  open() {
    this._positionPicker();
    this.pickerEl.classList.add('is-visible');
    this.isOpen = true;
    this._renderView();
  }

  close() {
    this.pickerEl.classList.remove('is-visible');
    this.isOpen = false;
  }

  clear() {
    this.startDate = null;
    this.endDate = null;
    this.hoverDate = null;
    this.input.value = '';
    this._renderView();
    if (typeof this.options.onSelect === 'function') {
      this.options.onSelect(null, '');
    }
  }
}