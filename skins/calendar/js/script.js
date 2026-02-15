// Monthly skin namespace to avoid conflicts
window.HeatmapMonthly = window.HeatmapMonthly || {};

// Store event handlers to prevent duplicate registration
if (!window.heatmapMonthlyHandlersInitialized) {
    window.heatmapMonthlyHandlersInitialized = true;
    
    jQuery(document).ready(function($) {
        // Year selection handler
        $(document).on('click', '.heatmap-section.heatmap-monthly .heatmap-year-list a', function(event) {
            event.preventDefault();
            const $section = $(this).closest('.heatmap-section.heatmap-monthly');
            const widgetId = $section.data('widget-id');
            
            $.ajax({
                url: $(this).attr('href'),
                type: 'GET',
                data: {
                    "search_year": $(this).attr('data-search-year'),
                    "widget_id_preserve": widgetId  // Pass widget ID to preserve it
                },
                dataType: 'html',
                success: function(resp) {
                    // Create a temporary container to parse the response
                    const $tempContainer = $('<div>').html(resp);
                    
                    // Find the heatmap section in response
                    const $newHeatmapSection = $tempContainer.find('.heatmap-section.heatmap-monthly').first();
                    
                    if ($newHeatmapSection.length === 0) {
                        console.error('No heatmap section found in response');
                        return;
                    }
                    
                    // Preserve the original widget ID
                    $newHeatmapSection.attr('data-widget-id', widgetId);
                    
                    // Clean up old scroll handler before replacing
                    const oldSlider = $section.find('.heatmap-slider')[0];
                    if (oldSlider && oldSlider._heatmapScrollHandler) {
                        oldSlider.removeEventListener('scroll', oldSlider._heatmapScrollHandler);
                        delete oldSlider._heatmapScrollHandler;
                    }
                    
                    // Replace the section
                    $section.replaceWith($newHeatmapSection);
                    
                    // Mark as initialized to prevent inline script from re-initializing
                    $newHeatmapSection.attr('data-initialized', 'true');
                    
                    const outputData = $newHeatmapSection.data("outputData");
                    const postsLevel = $newHeatmapSection.data("postsLevel");
                    const firstDate = $newHeatmapSection.data("firstDate");
                    const lastDate = $newHeatmapSection.data("lastDate");
                    
                    const container = $newHeatmapSection.find('[data-role="container"]')[0];
                    const dotsContainer = $newHeatmapSection.find('[data-role="dots"]')[0];
                    const documentsContainer = $newHeatmapSection.find('[data-role="documents"]')[0];
                    
                    if (container && dotsContainer) {
                        $(container).empty();
                        $(dotsContainer).empty();
                        window.HeatmapMonthly.createHeatmap(container, dotsContainer, documentsContainer, outputData, postsLevel, firstDate, lastDate);
                    }
                },
                error: function(request, status, error) {
                    alert('code: ' + request.status + '\n' + 'message: ' + request.responseText + '\n' + 'error: ' + error);
                }
            });
        });

        // Day cell click handler
        $(document).on('click', '.heatmap-section.heatmap-monthly .monthly-day', function(event) {
            event.preventDefault();
            const $dayCell = $(this);
            const dateStr = $dayCell.data('date');
            
            // Ignore out-of-range dates
            if (!dateStr || $dayCell.hasClass('out-of-range')) return;
            
            const $section = $dayCell.closest('.heatmap-section');
            const widgetId = $section.data('widget-id');
            const $documentsContainer = $section.find('[data-role="documents"]');
            
            // Toggle active cell within this widget only
            $section.find('.monthly-day').removeClass('active');
            $dayCell.addClass('active');
            
            // Display loading indicator
            $documentsContainer.html('<div class="documents-list-loading" style="text-align: center; padding: 20px;">Loading...</div>');
            
            $.ajax({
                url: window.location.href,
                type: 'GET',
                data: {
                    "written_at": dateStr,
                    "widget_id": widgetId  // Pass widget ID for backend filtering if needed
                },
                dataType: 'json',
                success: function(resp) {
                    if (resp.success) {
                        window.HeatmapMonthly.renderDocumentsList($documentsContainer[0], resp.documents, resp.date, resp.count);
                    } else {
                        $documentsContainer.html('<div class="documents-list-empty"><div class="documents-empty-text">오류가 발생했습니다.</div></div>');
                    }
                },
                error: function(request, status, error) {
                    console.error('Error fetching documents:', error);
                    $documentsContainer.html('<div class="documents-list-empty"><div class="documents-empty-text">문서를 불러오는데 실패했습니다.</div></div>');
                }
            });
        });
    });
}

window.HeatmapMonthly.createHeatmap = function(container, monthDotsContainer, documentsContainer, heatmapData, postsLevel, firstDate, lastDate) {
    const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function getLevelClass(postsLevel, countDoc) {
        if (countDoc < postsLevel[1]) {
            return 'level-0';
        } else if (countDoc < postsLevel[2]) {
            return 'level-1';
        } else if (countDoc < postsLevel[3]) {
            return 'level-2';
        } else if (countDoc < postsLevel[4]) {
            return 'level-3';
        } else if (postsLevel[4] <= countDoc) {
            return 'level-4';
        }
    }

    if (!container || !monthDotsContainer) return;
    
    // Generate month data
    const startDate = new Date(firstDate);
    const endDate = new Date(lastDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const monthsData = [];
    
    // Get the range of months to display
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    
    // Iterate through each month in the range
    let currentYear = startYear;
    let currentMonth = startMonth;
    
    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
        const monthData = {
            year: currentYear,
            month: currentMonth,
            monthName: MONTHS[currentMonth],
            days: []
        };
        
        // Get the first day of the month
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const firstDayOfWeek = firstDayOfMonth.getDay();
        
        // Add empty cells for alignment
        for (let i = 0; i < firstDayOfWeek; i++) {
            monthData.days.push({ isEmpty: true });
        }
        
        // Get the last day of the month
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Add all days of the month
        for (let day = 1; day <= lastDayOfMonth; day++) {
            // Create date string directly to avoid timezone issues
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const currentDate = new Date(currentYear, currentMonth, day);

            // Only count if the date is within the data range
            const isInRange = currentDate >= startDate && currentDate < endDate;
            const count = isInRange ? (heatmapData[dateStr] || 0) : 0;
            
            monthData.days.push({
                date: dateStr,
                day: day,
                count: count,
                level: getLevelClass(postsLevel, count),
                isOutOfRange: !isInRange
            });
        }
        monthsData.push(monthData);
        
        // Move to next month
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }
    
    // Find current month index for initial scroll
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    let currentMonthIndex = 0;
    let hasCurrentMonth = false;
    
    // Render monthly calendars
    monthsData.forEach((month, index) => {
        // Track current month index
        if (month.year === todayYear && month.month === todayMonth) {
            currentMonthIndex = index;
            hasCurrentMonth = true;
        }
        
        const monthDiv = document.createElement('div');
        monthDiv.className = 'monthly-calendar';
        monthDiv.dataset.monthIndex = index;
        
        // Month header
        const header = document.createElement('div');
        header.className = 'monthly-header';
        header.textContent = `${month.monthName} ${month.year}`;
        monthDiv.appendChild(header);
        
        // Weekday labels
        const weekdayRow = document.createElement('div');
        weekdayRow.className = 'monthly-weekdays';
        WEEKDAYS_SHORT.forEach(day => {
            const dayLabel = document.createElement('div');
            dayLabel.className = 'monthly-weekday-label';
            dayLabel.textContent = day;
            weekdayRow.appendChild(dayLabel);
        });
        monthDiv.appendChild(weekdayRow);
        
        // Days grid
        const daysGrid = document.createElement('div');
        daysGrid.className = 'monthly-days';
        
        month.days.forEach(dayData => {
            const dayDiv = document.createElement('div');
            if (dayData.isEmpty) {
                dayDiv.className = 'monthly-day-empty';
            } else {
                dayDiv.className = `monthly-day ${dayData.level}`;
                if (dayData.isOutOfRange) {
                    dayDiv.classList.add('out-of-range');
                }
                dayDiv.dataset.date = dayData.date;
                dayDiv.textContent = dayData.day;
                
                // Tooltip
                const tooltip = document.createElement('span');
                tooltip.className = 'tooltip';
                tooltip.textContent = `${dayData.count} posts`;
                dayDiv.appendChild(tooltip);
            }
            daysGrid.appendChild(dayDiv);
        });
        
        monthDiv.appendChild(daysGrid);
        container.appendChild(monthDiv);
        
        // Add month button to slider
        const dot = document.createElement('button');
        dot.className = 'month-dot';
        dot.dataset.monthIndex = index;
        dot.setAttribute('aria-label', `${month.monthName} ${month.year}`);
        
        // Mark current month (today's month)
        const isCurrentMonth = month.year === todayYear && month.month === todayMonth;
        if (isCurrentMonth) {
            dot.classList.add('is-current-month');
            dot.classList.add('is-active'); // Initially active on current month
        }
        
        monthDotsContainer.appendChild(dot);
    });
    
    // If current month doesn't exist in the data, activate and scroll to first month
    if (!hasCurrentMonth && monthDotsContainer.children.length > 0) {
        monthDotsContainer.children[0].classList.add('is-active');
        currentMonthIndex = 0;
    }
    
    // Initialize slider functionality with current month index
    window.HeatmapMonthly.initMonthSlider(container, monthDotsContainer, monthsData.length, currentMonthIndex);
}

window.HeatmapMonthly.initMonthSlider = function(container, dotsContainer, monthCount, initialMonthIndex) {
    const dots = dotsContainer.querySelectorAll('.month-dot');
    const calendars = container.querySelectorAll('.monthly-calendar');
    const slider = container.parentElement; // Get the actual scrolling element
    
    if (!dots.length || !calendars.length) return;
    
    // Check if slider is already initialized
    if (slider.dataset.sliderInitialized === 'true') {
        return;
    }
    slider.dataset.sliderInitialized = 'true';
    
    // Set initial month index (default to 0 if not provided)
    const startIndex = initialMonthIndex !== undefined ? initialMonthIndex : 0;
    
    function scrollToMonth(index) {
        if (!calendars[index]) return;
        
        // Use offsetLeft relative to container to get exact position
        const targetScrollLeft = calendars[index].offsetLeft;
        
        slider.scrollTo({
            left: targetScrollLeft,
            behavior: 'smooth'
        });
    }
    
    function setActiveDot(index) {
        dots.forEach((dot, i) => {
            if (i === index) {
                dot.classList.add('is-active');
            } else {
                dot.classList.remove('is-active');
            }
        });
    }
    
    // Dot click handlers
    dots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            scrollToMonth(index);
            setActiveDot(index);
        });
    });
    
    // Scroll observer - listen to slider (parent) scroll events
    let ticking = false;
    const scrollHandler = function() {
        if (ticking) return;
        
        ticking = true;
        window.requestAnimationFrame(function() {
            const sliderRect = slider.getBoundingClientRect();
            let closestIndex = 0;
            let closestDistance = Infinity;
            
            calendars.forEach((calendar, i) => {
                const calendarRect = calendar.getBoundingClientRect();
                const distance = Math.abs(calendarRect.left - sliderRect.left);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = i;
                }
            });
            
            setActiveDot(closestIndex);
            ticking = false;
        });
    };
    
    slider.addEventListener('scroll', scrollHandler);
    
    // Store the scroll handler for potential cleanup
    slider._heatmapScrollHandler = scrollHandler;
    
    // Scroll to initial month (current month) immediately without animation
    if (calendars[startIndex]) {
        const targetScrollLeft = calendars[startIndex].offsetLeft;
        slider.scrollLeft = targetScrollLeft; // Direct assignment for instant scroll
    }
}

window.HeatmapMonthly.renderDocumentsList = function(container, documents, dateStr, count) {
    if (!container) return;
    
    if (!documents || documents.length === 0) {
        container.innerHTML = `
            <div class="documents-list-empty">
                <div class="documents-empty-icon">📭</div>
                <div class="documents-empty-text">이 날짜에 작성한 문서가 없습니다.</div>
            </div>
        `;
        return;
    }
    
    // Header of the documents list
    let html = `
        <div class="documents-list-header">
            <span class="documents-list-date">📅 ${window.HeatmapMonthly.formatDate(dateStr)}</span>
            <span class="documents-list-count">${count}개의 문서</span>
        </div>
        <div class="documents-list-items">
    `;
    
    // Render each document item (compact version for monthly skin)
    documents.forEach(doc => {
        html += `
            <div class="documents-item">
                <a href="${window.HeatmapMonthly.escapeHtml(doc.url)}" class="documents-item-link" target="_blank">
                    <span class="documents-module-title">${window.HeatmapMonthly.decodeHtml(doc.module_title)}</span>
                    <span class="documents-item-title">${window.HeatmapMonthly.decodeHtml(doc.title)}</span>
                </a>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Scroll to the documents list
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Helper functions
window.HeatmapMonthly.formatDate = function(dateStr) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(5, 7);
    const day = dateStr.substring(8, 10);
    return `${year}년 ${month}월 ${day}일`;
}

window.HeatmapMonthly.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.HeatmapMonthly.decodeHtml = function(html) {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}
