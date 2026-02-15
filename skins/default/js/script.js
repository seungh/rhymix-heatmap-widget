// Default skin namespace to avoid conflicts
window.HeatmapDefault = window.HeatmapDefault || {};

// Store event handlers to prevent duplicate registration
if (!window.heatmapDefaultHandlersInitialized) {
    window.heatmapDefaultHandlersInitialized = true;
    
    jQuery(document).ready(function($) {
        // Year selection handler
        $(document).on('click', '.heatmap-section:not(.heatmap-monthly):not(.heatmap-vertical-section) .heatmap-year-list a', function(event) {
            event.preventDefault();
            const $section = $(this).closest('.heatmap-section:not(.heatmap-monthly):not(.heatmap-vertical-section)');
            const widgetId = $section.data('widget-id');
            
            $.ajax({
                url: $(this).attr('href'),
                type: 'GET',
                data: {
                    "search_year": $(this).attr('data-search-year'),
                    "widget_id_preserve": widgetId
                },
                dataType: 'html',
                success: function(resp) {
                    const $tempContainer = $('<div>').html(resp);
                    const $newHeatmapSection = $tempContainer.find('.heatmap-section:not(.heatmap-monthly):not(.heatmap-vertical-section)').first();
                    
                    if ($newHeatmapSection.length === 0) {
                        console.error('No heatmap section found in response');
                        return;
                    }
                    
                    // Preserve the original widget ID
                    $newHeatmapSection.attr('data-widget-id', widgetId);
                    
                    // Replace the section
                    $section.replaceWith($newHeatmapSection);
                    
                    // Mark as initialized
                    $newHeatmapSection.attr('data-initialized', 'true');
                    
                    const outputData = $newHeatmapSection.data("outputData");
                    const postsLevel = $newHeatmapSection.data("postsLevel");
                    const firstDate = $newHeatmapSection.data("firstDate");
                    const lastDate = $newHeatmapSection.data("lastDate");
                    
                    const heatmapElement = $newHeatmapSection.find('[data-role="heatmap"]')[0];
                    if (heatmapElement) {
                        $(heatmapElement).empty();
                        window.HeatmapDefault.createHeatmap(heatmapElement, outputData, postsLevel, firstDate, lastDate);
                    }
                },
                error: function(request, status, error) {
                    alert('code: ' + request.status + '\n' + 'message: ' + request.responseText + '\n' + 'error: ' + error);
                }
            });
        });

        // Day cell click handler
        $(document).on('click', '.heatmap-section:not(.heatmap-monthly):not(.heatmap-vertical-section) .day', function(event) {
            event.preventDefault();
            const $dayCell = $(this);
            const dateStr = $dayCell.data('date');
            
            if (!dateStr) return;
            
            const $section = $dayCell.closest('.heatmap-section:not(.heatmap-monthly):not(.heatmap-vertical-section)');
            const widgetId = $section.data('widget-id');
            const $documentsContainer = $section.find('[data-role="documents-list-container"]');
            
            // Toggle active cell within this widget only
            $section.find('.day').removeClass('active');
            $dayCell.addClass('active');
            
            // Display loading indicator
            $documentsContainer.html('<div class="documents-list-loading" style="text-align: center; padding: 20px;">Loading...</div>');
            
            $.ajax({
                url: window.location.href,
                type: 'GET',
                data: {
                    "written_at": dateStr,
                    "widget_id": widgetId
                },
                dataType: 'json',
                success: function(resp) {
                    if (resp.success) {
                        window.HeatmapDefault.renderDocumentsList($documentsContainer[0], resp.documents, resp.date, resp.count);
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

window.HeatmapDefault.createHeatmap = function(heatmapElement, heatmapData, postsLevel, firstDate, lastDate) {

    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MAX_ROW = 8;
    const MAX_COLUMN = 53;

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

    const heatmap = heatmapElement;

    /* row head: weekday label */
    for (let i=0; i<MAX_ROW; i++) {
        const div = document.createElement('div');
        div.className = 'weekday-label';
        if (i != 0) {
            div.innerText = WEEKDAYS[i-1];
        }
        div.style.gridRowStart = i + 1;
        div.style.gridColumnStart = 1;
        heatmap.appendChild(div);
    }

    const currDate = new Date(firstDate);
    let printMonthLabel = true;
    /* to avoid overlapping first two month labels */
    if (currDate.getDate() > 20) {
        printMonthLabel = false;
    }
    let monthIndex = currDate.getMonth() + 1;
    let startWeekday = currDate.getDay();

    for (let i=0; i<MAX_ROW * MAX_COLUMN; i++) {
        const div = document.createElement('div');
        const rowIndex = (i % 8) + 1;
        const columnIndex = Math.floor(i / 8) + 2;
        div.style.gridRowStart = rowIndex;
        div.style.gridColumnStart = columnIndex;

        /* column head: month label */
        if (i % 8 == 0) {
            div.className = 'month-label';
            if (printMonthLabel == true) {
                div.innerText = MONTHS[monthIndex-1];
                printMonthLabel = false;
            }
        }
        else {
            /* check for the start cell */
            if (startWeekday != 0) {
                startWeekday -= 1;
                continue;
            }
            /* check for the last cell */
            if (currDate > new Date(lastDate)) {
                console.log("Reached the end date:", currDate.toISOString().split('T')[0]);
                console.log("Curr date:", currDate, "Last date:", lastDate);
                break;
            }

            /* update day cell info in heatmap */
            dateIndex = currDate.toISOString().split('T')[0];
            const countDocuments = heatmapData[dateIndex] || 0;
            div.className = 'day';
            div.setAttribute('data-date', dateIndex);
            if (countDocuments >= 0) {
                const levelClass = getLevelClass(postsLevel, countDocuments);
                div.classList.add(levelClass);
            }

            /* add tooltip to the day cell */
            const span = document.createElement('span');
            span.className = 'tooltip';
            span.innerText = `${countDocuments} posts on ${dateIndex}`;
            div.appendChild(span);

            /* update current date */
            currDate.setDate(currDate.getDate() + 1);

            /* update info for the next month label */
            if (monthIndex != currDate.getMonth() + 1) {
                printMonthLabel = true;
                monthIndex = currDate.getMonth() + 1;
            }
        }
        heatmap.appendChild(div);
    }
}

window.HeatmapDefault.renderDocumentsList = function(container, documents, dateStr, count) {
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
            <span class="documents-list-date">📅 ${window.HeatmapDefault.formatDate(dateStr)}</span>
            <span class="documents-list-count">${count}개의 문서</span>
        </div>
        <div class="documents-list-items">
    `;
    
    // Render each document item
    documents.forEach(doc => {
        const time = doc.regdate;
        html += `
            <div class="documents-item">
                <a href="${window.HeatmapDefault.escapeHtml(doc.url)}" class="documents-item-link" target="_blank">
                    <span class="documents-module-title">${window.HeatmapDefault.decodeHtml(doc.module_title)}</span>
                    <span class="documents-item-title">${window.HeatmapDefault.decodeHtml(doc.title)}</span>
                    <div class="documents-item-stats">
                        <span class="documents-item-stat">💬 ${doc.comments}</span>
                        <span class="documents-item-stat">👁 ${doc.views}</span>
                    </div>
                    <span class="documents-item-time">${time}</span>
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
window.HeatmapDefault.formatDate = function(dateStr) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(5, 7);
    const day = dateStr.substring(8, 10);
    return `${year}년 ${month}월 ${day}일`;
}

window.HeatmapDefault.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.HeatmapDefault.decodeHtml = function(html) {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}
