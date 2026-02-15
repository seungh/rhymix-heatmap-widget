// Default-vertical skin namespace to avoid conflicts
window.HeatmapVertical = window.HeatmapVertical || {};

// Store event handlers to prevent duplicate registration
if (!window.heatmapVerticalHandlersInitialized) {
	window.heatmapVerticalHandlersInitialized = true;
	
	jQuery(document).ready(function($) {
		// Year selection handler
		$(document).on('click', '.heatmap-vertical-section .heatmap-vertical-year-list a', function(event) {
			event.preventDefault();
			const $section = $(this).closest('.heatmap-vertical-section');
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
					const $newHeatmapSection = $tempContainer.find('.heatmap-vertical-section').first();
					
					if ($newHeatmapSection.length === 0) {
						console.error('No heatmap vertical section found in response');
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
					
					const heatmapElement = $newHeatmapSection.find('[data-role="heatmap-vertical"]')[0];
					if (heatmapElement) {
						$(heatmapElement).empty();
						window.HeatmapVertical.createHeatmap(heatmapElement, outputData, postsLevel, firstDate, lastDate);
					}
				},
				error: function(request, status, error) {
					alert('code: ' + request.status + '\n' + 'message: ' + request.responseText + '\n' + 'error: ' + error);
				}
			});
		});
	});
}

window.HeatmapVertical.createHeatmap = function(heatmapElement, heatmapData, postsLevel, firstDate, lastDate) {

    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MAX_ROW = 54;
    const MAX_COLUMN = 8;

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

    const currDate = new Date(firstDate + "T01:00Z");
    let printMonthLabel = true;
    let monthIndex = currDate.getMonth() + 1;
    let startWeekday = currDate.getDay();

    for (let i=0; i<MAX_ROW; i++) {
        for (let j=0; j<MAX_COLUMN; j++) {

            const div = document.createElement('div');
            div.style.gridRowStart = i + 1;
            div.style.gridColumnStart = j + 1;

            if (i===0 && j===0) {
                continue;
            }
            /* weekday label */
            if (i===0) {
                if (j===1) {
                    div.className = 'weekday-label-left';
                    div.innerText = WEEKDAYS[0];
                } else if (j===7) {
                    div.className = 'weekday-label-right';
                    div.innerText = WEEKDAYS[6];
                }
            }
            /* month label */
            else if (j===0) {
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
                if (currDate >= new Date(lastDate)) {
                    break;
                }   

                /* update day cell info in heatmap */
                dateIndex = currDate.toISOString().split('T')[0];
                const countDocuments = heatmapData[dateIndex] || 0;
                div.className = 'day';
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
}
