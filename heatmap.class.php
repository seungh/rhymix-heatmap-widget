<?php

class heatmap extends WidgetHandler
{
    function proc($args)
    {
        $is_logged = Context::get('is_logged');
        if ($is_logged == false) {
            return;
        }

        $search_year = Context::get('search_year') ? Context::get('search_year') : NULL;
        if ($search_year) {
            $first_date = date("Y-m-d", strtotime($search_year . "0101"));
            $last_date = date("Y-m-d", strtotime($search_year . "1231"));
        }
        else {
            $first_date = date("Y-m-d", strtotime("last sunday - 52 weeks"));
            $last_date = date("Y-m-d");
        }

        $obj = new stdClass();
        $obj->member_srl = Context::get('logged_info')->member_srl;
        $obj->module_srl = $args->module_srls;
        $obj->first_date = str_replace("-", "", $first_date);
        $obj->last_date =  str_replace("-", "", $last_date);
        $output = executeQueryArray("widgets.heatmap.getDocuments", $obj);

        $widget_info = new stdClass();
        $widget_info->title = $args->title;
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
            array($lv1, $lv2, $lv3, $lv4) : array(1, 2, 3, 4);

        $output_data = array();
        if ($output->toBool()) {
            foreach ($output->data as $val) {
                $date = date("Y-m-d", strtotime($val->regdate));
                if (array_key_exists($date, $output_data)) {
                    $output_data[$date] += 1;
                } 
                else {
                    $output_data[$date] = 1;
                }
            }
        }
        $hm_data->output_data = $output_data;
        Context::set("hm_data", $hm_data);

        /* Set template skin path */
		$tpl_path = sprintf('%sskins/%s', $this->widget_path, $args->skin);

        /* Set template file */
		$tpl_file = 'heatmap';

        /* compile template */
        $oTemplate = &TemplateHandler::getInstance();
        return $oTemplate->compile($tpl_path, $tpl_file);
    }
}
?>