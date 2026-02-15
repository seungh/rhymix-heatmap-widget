<?php

class heatmap extends WidgetHandler
{
    function proc($args)
    {
        $written_at = Context::get('written_at');
        if ($written_at) {
            $this->getDocumentsByDate($args, $written_at);
        }

        $search_year = Context::get('search_year') ? Context::get('search_year') : null;
        $search_year = ($search_year === null && $args->default_display == "this_year") ? date("Y") : $search_year;
        if ($search_year) {
            $first_date = date("Y-m-d", strtotime($search_year . "0101"));
            $last_date = date("Y-m-d", strtotime($search_year . "1231"));
        }
        else {
            $first_date = date("Y-m-d", strtotime("last sunday - 52 weeks"));
            $last_date = date("Y-m-d");
        }

        $widget_info = new stdClass();
        $widget_info->title = $args->title;
        $widget_info->module_srls = $args->module_srls;
        Context::set("widget_info", $widget_info);

        $hm_data = new stdClass();
        $hm_data->first_date = $first_date;
        $hm_data->last_date = $last_date;
        $hm_data->search_year = $search_year ? $search_year : NULL;
        $hm_data->reg_year = date("Y", strtotime(Context::get('logged_info')->regdate));
        $hm_data->this_year = date("Y");

        $lv1 = $args->posts_level_1 ?? 1;
        $lv2 = $args->posts_level_2 ?? 2;
        $lv3 = $args->posts_level_3 ?? 3;
        $lv4 = $args->posts_level_4 ?? 4;
        $hm_data->posts_level = (0 < $lv1 && $lv1 < $lv2 && $lv2 < $lv3 && $lv3 < $lv4) ?
            array(0, $lv1, $lv2, $lv3, $lv4) : array(0, 1, 2, 3, 4);

        $is_logged = Context::get('is_logged');
        if ($is_logged) {
            $obj = new stdClass();
            $obj->member_srl = Context::get('logged_info')->member_srl;
            $obj->module_srl = $args->module_srls;
            $obj->first_date = str_replace("-", "", date("Y-m-d", strtotime($first_date)));
            $obj->last_date =  str_replace("-", "", date("Y-m-d", strtotime($last_date . "today + 1 day")));
            $output = executeQueryArray("widgets.heatmap.getDocumentCountByRegdate", $obj);
            
            if ($output->toBool()) {
                $output_data = array();
                foreach ($output->data as $val) {
                    $date = date("Y-m-d", strtotime($val->regdate));
                    if (isset($output_data[$date])) {
                        $output_data[$date] += $val->count;
                    } else {
                        $output_data[$date] = $val->count;
                    }
                }
            }
        }
        $hm_data->output_data = $output_data ?? array();
        Context::set("hm_data", $hm_data);

        /* Set template skin path */
		$tpl_path = sprintf('%sskins/%s', $this->widget_path, $args->skin);

        /* Set template file */
		$tpl_file = 'heatmap';

        /* compile template */
        $oTemplate = &TemplateHandler::getInstance();
        return $oTemplate->compile($tpl_path, $tpl_file);
    }

    function getDocumentsByDate($args, $written_at)
    {
        $is_logged = Context::get('is_logged');
        if (!$is_logged) {
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode([
                'error' => true,
                'message' => 'Login required'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Generate cache key based on member_srl and written_at
        $member_srl = Context::get('logged_info')->member_srl;
        $cache_key = 'heatmap_docs_' . $member_srl . '_' . $written_at;
        
        // Use cache for past dates, but not for today
        $today = date('Y-m-d');
        $use_cache = ($written_at < $today);        
        if ($use_cache) {
            $cache = Rhymix\Framework\Cache::get($cache_key);
            if ($cache !== null) {
                header('Content-Type: application/json; charset=UTF-8');
                echo json_encode($cache, JSON_UNESCAPED_UNICODE);
                exit;
            }
        }

        $obj = new stdClass();
        $obj->member_srl = $member_srl;
        $obj->module_srl = $args->module_srls;
        $obj->written_at = str_replace("-", "", $written_at);
        
        $output = executeQueryArray("widgets.heatmap.getDocumentList", $obj);        
        $documents = [];
        if ($output->toBool() && $output->data) {
            foreach ($output->data as $doc) {
                // 날짜 형식 포맷팅
                $timestamp = strtotime($doc->regdate);
                $formatted_date = date('Y-m-d H:i', $timestamp);
                
                // 모듈 정보 가져오기
                $oModuleModel = getModel('module');
                $module_info = $oModuleModel->getModuleInfoByModuleSrl($doc->module_srl);
                
                $documents[] = [
                    'document_srl' => $doc->document_srl,
                    'module_srl' => $doc->module_srl,
                    'mid' => $module_info->mid ?? '',
                    'module_title' => $module_info->browser_title ?: ($module_info->mid ?? ''),
                    'title' => $doc->title,
                    'regdate' => $formatted_date,
                    'views' => $doc->readed_count ?: 0,
                    'comments' => $doc->comment_count ?: 0,
                    'votes' => $doc->voted_count ?: 0,
                    'nick_name' => $doc->nick_name,
                    'url' => getUrl('', 'mid', $module_info->mid ?? '', 'document_srl', $doc->document_srl)
                ];
            }
        }
        
        $result = [
            'success' => true,
            'date' => $written_at,
            'count' => count($documents),
            'documents' => $documents
        ];
        
        // 24 hours cache for past dates, no cache for today
        if ($use_cache) {
            Rhymix\Framework\Cache::set($cache_key, $result, 60 * 60 * 24);
        }
        
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }
}
?>