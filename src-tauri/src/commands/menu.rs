use tauri::{AppHandle, Emitter, Manager};
use tauri::menu::{Menu, MenuItem, MenuVec, Submenu};
use tauri::Accelerator;

fn tr(lang: &str, zh: &str, en: &str) -> &'static str {
    if lang == "en" {
        Box::leak(en.to_string().into_boxed_str())
    } else {
        Box::leak(zh.to_string().into_boxed_str())
    }
}

/// Platform-aware accelerator: Cmd on Mac, Ctrl on Windows/Linux
fn acc(keys: &str) -> Option<Accelerator> {
    // Accept strings like "CmdOrControl+KeyS" or "Ctrl+S"
    // Tauri 2.x Accelerator parsing is limited, so we use a simple approach
    Accelerator::new(keys).ok()
}

macro_rules! m {
    ($app:expr, $id:literal, $label:expr) => {
        MenuItem::with_id($app, $id, $label, true, None::<&str>)
    };
    ($app:expr, $id:literal, $label:expr, $acc:expr) => {
        MenuItem::with_id_and_accelerator($app, $id, $label, true, $acc)
    };
}

pub fn build_menu(app_handle: &AppHandle, lang: &str) -> tauri::Result<()> {
    let a = |keys: &str| acc(keys);

    let file_menu = Submenu::with_items(app_handle, tr(lang, "文件", "File"), true, &[
        &m!(app_handle, "new", tr(lang, "新建", "New"))?,
        &m!(app_handle, "open", tr(lang, "打开...", "Open..."))?,
        &m!(app_handle, "open_with_encoding", tr(lang, "按编码打开...", "Open with Encoding..."))?,
        &m!(app_handle, "reload_from_disk", tr(lang, "从磁盘重载", "Reload from Disk"))?,
        &m!(app_handle, "save", tr(lang, "保存", "Save"), a("CmdOrControl+S"))?,
        &m!(app_handle, "save_as", tr(lang, "另存为...", "Save As..."))?,
        &m!(app_handle, "save_copy", tr(lang, "保存副本...", "Save Copy..."))?,
        &m!(app_handle, "save_all", tr(lang, "全部保存", "Save All"), a("CmdOrControl+Shift+S"))?,
        &m!(app_handle, "close", tr(lang, "关闭", "Close"), a("CmdOrControl+W"))?,
        &m!(app_handle, "close_all", tr(lang, "关闭所有", "Close All"), a("CmdOrControl+Shift+W"))?,
        &m!(app_handle, "close_all_but_current", tr(lang, "关闭所有但当前", "Close All but Current"))?,
        &Submenu::with_items(app_handle, tr(lang, "文件操作", "File Operations"), true, &[
            &m!(app_handle, "copy_path", tr(lang, "复制文件路径", "Copy File Path"))?,
            &m!(app_handle, "copy_directory", tr(lang, "复制目录路径", "Copy Directory Path"))?,
            &m!(app_handle, "copy_filename", tr(lang, "复制文件名", "Copy Filename"))?,
            &m!(app_handle, "toggle_bom", tr(lang, "切换 BOM", "Toggle BOM"))?,
            &m!(app_handle, "open_in_default", tr(lang, "在默认程序打开", "Open in Default App"))?,
            &m!(app_handle, "run_command", tr(lang, "运行命令...", "Run Command..."))?,
            &m!(app_handle, "file_props", tr(lang, "文件属性...", "File Properties..."))?,
        ])?,
        &m!(app_handle, "quit", tr(lang, "退出 MarkPT", "Quit MarkPT"), a("CmdOrControl+Q"))?,
    ])?;

    let edit_menu = Submenu::with_items(app_handle, tr(lang, "编辑", "Edit"), true, &[
        &m!(app_handle, "edit_undo", tr(lang, "撤销", "Undo"), a("CmdOrControl+Z"))?,
        &m!(app_handle, "edit_redo", tr(lang, "重做", "Redo"), a("CmdOrControl+Shift+Z"))?,
        &m!(app_handle, "edit_cut", tr(lang, "剪切", "Cut"), a("CmdOrControl+X"))?,
        &m!(app_handle, "edit_copy", tr(lang, "复制", "Copy"), a("CmdOrControl+C"))?,
        &m!(app_handle, "edit_paste", tr(lang, "粘贴", "Paste"), a("CmdOrControl+V"))?,
        &m!(app_handle, "edit_toggle_comment", tr(lang, "切换注释", "Toggle Comment"), a("CmdOrControl+/"))?,
        &m!(app_handle, "edit_delete_line", tr(lang, "删除当前行", "Delete Current Line"), a("CmdOrControl+D"))?,
        &m!(app_handle, "edit_duplicate_line", tr(lang, "复制当前行", "Duplicate Current Line"), a("Shift+Alt+D"))?,
        &m!(app_handle, "edit_move_up", tr(lang, "上移行", "Move Line Up"), a("Alt+Up"))?,
        &m!(app_handle, "edit_move_down", tr(lang, "下移行", "Move Line Down"), a("Alt+Down"))?,
        &Submenu::with_items(app_handle, tr(lang, "大小写转换", "Case Conversion"), true, &[
            &m!(app_handle, "edit_upper", tr(lang, "转大写", "UPPERCASE"), a("CmdOrControl+Shift+U"))?,
            &m!(app_handle, "edit_lower", tr(lang, "转小写", "lowercase"))?,
            &m!(app_handle, "edit_sentence_case", tr(lang, "句首大写", "Sentence Case"))?,
            &m!(app_handle, "edit_random_case", tr(lang, "随机大小写", "Random Case"))?,
        ])?,
        &Submenu::with_items(app_handle, tr(lang, "行排序", "Line Sorting"), true, &[
            &m!(app_handle, "edit_sort_asc", tr(lang, "行排序(升序)", "Sort Lines (Asc)"))?,
            &m!(app_handle, "edit_sort_desc", tr(lang, "行排序(降序)", "Sort Lines (Desc)"))?,
            &m!(app_handle, "edit_sort_length_asc", tr(lang, "按长度排序(升序)", "Sort by Length (Asc)"))?,
            &m!(app_handle, "edit_sort_length_desc", tr(lang, "按长度排序(降序)", "Sort by Length (Desc)"))?,
            &m!(app_handle, "edit_sort_random", tr(lang, "随机排序", "Sort Randomly"))?,
            &m!(app_handle, "edit_reverse_lines", tr(lang, "反转行序", "Reverse Line Order"))?,
        ])?,
        &Submenu::with_items(app_handle, tr(lang, "行操作", "Line Operations"), true, &[
            &m!(app_handle, "edit_delete_blank", tr(lang, "删除空行", "Delete Blank Lines"))?,
            &m!(app_handle, "edit_remove_dup", tr(lang, "去重复行", "Remove Duplicate Lines"))?,
            &m!(app_handle, "edit_trim_trailing", tr(lang, "去行尾空格", "Trim Trailing Whitespace"))?,
            &m!(app_handle, "edit_filter_lines", tr(lang, "过滤行...", "Filter Lines..."))?,
            &m!(app_handle, "edit_filter_lines_remove", tr(lang, "移除匹配行...", "Remove Matching Lines..."))?,
            &m!(app_handle, "edit_merge_lines", tr(lang, "合并行(空格)", "Merge Lines (Space)"))?,
            &m!(app_handle, "edit_merge_lines_comma", tr(lang, "合并行(逗号)", "Merge Lines (Comma)"))?,
            &m!(app_handle, "edit_split_line", tr(lang, "拆分行", "Split Line"))?,
        ])?,
        &Submenu::with_items(app_handle, tr(lang, "格式化", "Format"), true, &[
            &m!(app_handle, "format_code", tr(lang, "格式化代码", "Format Code"))?,
            &m!(app_handle, "format_json", tr(lang, "格式化 JSON", "Format JSON"))?,
            &m!(app_handle, "format_xml", tr(lang, "格式化 XML", "Format XML"))?,
            &m!(app_handle, "format_html", tr(lang, "格式化 HTML", "Format HTML"))?,
            &m!(app_handle, "format_css", tr(lang, "格式化 CSS", "Format CSS"))?,
            &m!(app_handle, "format_sql", tr(lang, "格式化 SQL", "Format SQL"))?,
        ])?,
        &m!(app_handle, "eol_lf", tr(lang, "行尾: LF", "EOL: LF"))?,
        &m!(app_handle, "eol_crlf", tr(lang, "行尾: CRLF", "EOL: CRLF"))?,
        &m!(app_handle, "eol_cr", tr(lang, "行尾: CR", "EOL: CR"))?,
        &m!(app_handle, "tab_to_space", tr(lang, "Tab 转空格", "Tab to Space"))?,
        &m!(app_handle, "space_to_tab", tr(lang, "空格转 Tab", "Space to Tab"))?,
        &Submenu::with_items(app_handle, tr(lang, "插入", "Insert"), true, &[
            &m!(app_handle, "insert_datetime", tr(lang, "插入日期时间...", "Insert DateTime..."))?,
            &m!(app_handle, "special_char", tr(lang, "特殊字符...", "Special Characters..."))?,
            &m!(app_handle, "color_picker", tr(lang, "颜色选择器...", "Color Picker..."))?,
            &m!(app_handle, "insert_file", tr(lang, "插入文件内容...", "Insert File Content..."))?,
        ])?,
        &Submenu::with_items(app_handle, tr(lang, "字符转换", "Character Conversion"), true, &[
            &m!(app_handle, "char_full_width", tr(lang, "转全角", "To Full Width"))?,
            &m!(app_handle, "char_half_width", tr(lang, "转半角", "To Half Width"))?,
            &m!(app_handle, "char_remove_non_printable", tr(lang, "删除非打印字符", "Remove Non-printable"))?,
            &m!(app_handle, "char_normalize_nfc", tr(lang, "Unicode NFC", "Unicode NFC"))?,
            &m!(app_handle, "char_to_snake", tr(lang, "转 snake_case", "To snake_case"))?,
            &m!(app_handle, "char_to_camel", tr(lang, "转 camelCase", "To camelCase"))?,
            &m!(app_handle, "char_to_pascal", tr(lang, "转 PascalCase", "To PascalCase"))?,
            &m!(app_handle, "char_to_kebab", tr(lang, "转 kebab-case", "To kebab-case"))?,
        ])?,
    ])?;

    let search_menu = Submenu::with_items(app_handle, tr(lang, "查找", "Search"), true, &[
        &m!(app_handle, "find", tr(lang, "查找...", "Find..."), a("CmdOrControl+F"))?,
        &m!(app_handle, "find_next", tr(lang, "查找下一个", "Find Next"), a("F3"))?,
        &m!(app_handle, "find_prev", tr(lang, "查找上一个", "Find Previous"), a("Shift+F3"))?,
        &m!(app_handle, "replace", tr(lang, "替换...", "Replace..."), a("CmdOrControl+H"))?,
        &m!(app_handle, "find_in_files", tr(lang, "在文件中查找...", "Find in Files..."), a("CmdOrControl+Shift+F"))?,
        &m!(app_handle, "batch_find_replace", tr(lang, "批量查找替换...", "Batch Find/Replace..."))?,
        &m!(app_handle, "multi_search", tr(lang, "多文档查找替换...", "Multi-Document Search..."))?,
        &m!(app_handle, "goto", tr(lang, "转到行...", "Go to Line..."), a("CmdOrControl+G"))?,
        &m!(app_handle, "jump_to_bracket", tr(lang, "跳转到匹配括号", "Jump to Bracket"))?,
        &m!(app_handle, "select_to_bracket", tr(lang, "选中到匹配括号", "Select to Bracket"))?,
        &m!(app_handle, "mark_all", tr(lang, "标记所有匹配", "Mark All Matches"))?,
        &m!(app_handle, "unmark_all", tr(lang, "取消所有标记", "Unmark All"))?,
        &m!(app_handle, "next_bookmark", tr(lang, "下一书签", "Next Bookmark"), a("F2"))?,
        &m!(app_handle, "prev_bookmark", tr(lang, "上一书签", "Previous Bookmark"), a("Shift+F2"))?,
        &m!(app_handle, "clear_bookmarks", tr(lang, "清除所有书签", "Clear All Bookmarks"))?,
    ])?;

    let view_menu = Submenu::with_items(app_handle, tr(lang, "视图", "View"), true, &[
        &m!(app_handle, "toggle_sidebar", tr(lang, "切换侧边栏", "Toggle Sidebar"), a("CmdOrControl+\\"))?,
        &m!(app_handle, "command_palette", tr(lang, "命令面板...", "Command Palette..."), a("CmdOrControl+P"))?,
        &m!(app_handle, "split_horizontal", tr(lang, "水平分屏", "Split Horizontal"))?,
        &m!(app_handle, "split_vertical", tr(lang, "垂直分屏", "Split Vertical"))?,
        &m!(app_handle, "split_close", tr(lang, "关闭分屏", "Close Split"))?,
        &m!(app_handle, "function_list", tr(lang, "函数列表...", "Function List..."), a("CmdOrControl+Shift+O"))?,
        &m!(app_handle, "doc_switcher", tr(lang, "切换文档...", "Switch Document..."), a("CmdOrControl+Tab"))?,
        &m!(app_handle, "toggle_word_wrap", tr(lang, "自动换行", "Word Wrap"), a("Alt+Z"))?,
        &m!(app_handle, "zoom_in", tr(lang, "放大", "Zoom In"), a("CmdOrControl+="))?,
        &m!(app_handle, "zoom_out", tr(lang, "缩小", "Zoom Out"), a("CmdOrControl+-"))?,
        &m!(app_handle, "zoom_reset", tr(lang, "重置缩放", "Reset Zoom"), a("CmdOrControl+0"))?,
        &m!(app_handle, "full_screen", tr(lang, "全屏", "Full Screen"), a("F11"))?,
        &m!(app_handle, "always_on_top", tr(lang, "窗口置顶", "Always on Top"))?,
        &m!(app_handle, "postit_mode", tr(lang, "便利贴模式", "Post-it Mode"))?,
        &Submenu::with_items(app_handle, tr(lang, "工具窗口", "Tool Windows"), true, &[
            &m!(app_handle, "markdown_preview", tr(lang, "Markdown 预览...", "Markdown Preview..."))?,
            &m!(app_handle, "csv_viewer", tr(lang, "CSV/TSV 查看...", "CSV/TSV Viewer..."))?,
            &m!(app_handle, "regex_tester", tr(lang, "正则测试器...", "Regex Tester..."))?,
            &m!(app_handle, "hex_viewer", tr(lang, "十六进制查看...", "Hex Viewer..."), a("CmdOrControl+Shift+H"))?,
            &m!(app_handle, "char_stats", tr(lang, "字符统计...", "Character Stats..."), a("CmdOrControl+Shift+C"))?,
        ])?,
        &Submenu::with_items(app_handle, tr(lang, "标签排序", "Sort Tabs"), true, &[
            &m!(app_handle, "window_sort_name", tr(lang, "按名称", "by Name"))?,
            &m!(app_handle, "window_sort_path", tr(lang, "按路径", "by Path"))?,
            &m!(app_handle, "window_sort_time", tr(lang, "按类型", "by Type"))?,
        ])?,
        &Submenu::with_items(app_handle, tr(lang, "窗口排列", "Window Layout"), true, &[
            &m!(app_handle, "window_cascade", tr(lang, "层叠窗口", "Cascade Windows"))?,
            &m!(app_handle, "window_tile_horizontal", tr(lang, "水平平铺", "Tile Horizontally"))?,
            &m!(app_handle, "window_tile_vertical", tr(lang, "垂直平铺", "Tile Vertically"))?,
        ])?,
    ])?;

    let encoding_menu = Submenu::with_items(app_handle, tr(lang, "编码", "Encoding"), true, &[
        &m!(app_handle, "encoding", tr(lang, "编码设置...", "Encoding Settings..."))?,
        &m!(app_handle, "encode_utf8", tr(lang, "用 UTF-8 编码", "Encode as UTF-8"))?,
        &m!(app_handle, "encode_utf8_bom", tr(lang, "用 UTF-8-BOM 编码", "Encode as UTF-8-BOM"))?,
        &m!(app_handle, "encode_gbk", tr(lang, "用 GBK 编码", "Encode as GBK"))?,
        &m!(app_handle, "encode_gb2312", tr(lang, "用 GB2312 编码", "Encode as GB2312"))?,
        &m!(app_handle, "encode_utf16le", tr(lang, "用 UTF-16LE 编码", "Encode as UTF-16LE"))?,
        &m!(app_handle, "encode_utf16be", tr(lang, "用 UTF-16BE 编码", "Encode as UTF-16BE"))?,
        &m!(app_handle, "encode_ascii", tr(lang, "用 ASCII 编码", "Encode as ASCII"))?,
        &m!(app_handle, "convert_utf8", tr(lang, "转换为 UTF-8", "Convert to UTF-8"))?,
        &m!(app_handle, "convert_utf8_bom", tr(lang, "转换为 UTF-8-BOM", "Convert to UTF-8-BOM"))?,
        &m!(app_handle, "convert_gbk", tr(lang, "转换为 GBK", "Convert to GBK"))?,
        &m!(app_handle, "convert_gb2312", tr(lang, "转换为 GB2312", "Convert to GB2312"))?,
        &m!(app_handle, "convert_utf16le", tr(lang, "转换为 UTF-16LE", "Convert to UTF-16LE"))?,
        &m!(app_handle, "convert_utf16be", tr(lang, "转换为 UTF-16BE", "Convert to UTF-16BE"))?,
    ])?;

    let language_menu = Submenu::with_items(app_handle, tr(lang, "语言", "Language"), true, &[
        &m!(app_handle, "language_selector", tr(lang, "选择语言...", "Select Language..."))?,
        &m!(app_handle, "lang_plaintext", tr(lang, "纯文本", "Plain Text"))?,
        &m!(app_handle, "lang_javascript", tr(lang, "JavaScript", "JavaScript"))?,
        &m!(app_handle, "lang_typescript", tr(lang, "TypeScript", "TypeScript"))?,
        &m!(app_handle, "lang_python", tr(lang, "Python", "Python"))?,
        &m!(app_handle, "lang_rust", tr(lang, "Rust", "Rust"))?,
        &m!(app_handle, "lang_c", tr(lang, "C", "C"))?,
        &m!(app_handle, "lang_cpp", tr(lang, "C++", "C++"))?,
        &m!(app_handle, "lang_java", tr(lang, "Java", "Java"))?,
        &m!(app_handle, "lang_go", tr(lang, "Go", "Go"))?,
        &m!(app_handle, "lang_html", tr(lang, "HTML", "HTML"))?,
        &m!(app_handle, "lang_css", tr(lang, "CSS", "CSS"))?,
        &m!(app_handle, "lang_json", tr(lang, "JSON", "JSON"))?,
        &m!(app_handle, "lang_xml", tr(lang, "XML", "XML"))?,
        &m!(app_handle, "lang_markdown", tr(lang, "Markdown", "Markdown"))?,
        &m!(app_handle, "lang_sql", tr(lang, "SQL", "SQL"))?,
        &m!(app_handle, "lang_shell", tr(lang, "Shell", "Shell"))?,
        &m!(app_handle, "lang_yaml", tr(lang, "YAML", "YAML"))?,
    ])?;

    let settings_menu = Submenu::with_items(app_handle, tr(lang, "设置", "Settings"), true, &[
        &m!(app_handle, "settings", tr(lang, "首选项...", "Preferences..."), a("CmdOrControl+,"))?,
        &m!(app_handle, "shortcut_mapper", tr(lang, "快捷键映射...", "Shortcut Mapper..."))?,
        &m!(app_handle, "shortcuts", tr(lang, "快捷键帮助...", "Shortcut Help..."), a("CmdOrControl+/"))?,
        &m!(app_handle, "snippets", tr(lang, "代码片段...", "Snippets..."))?,
        &m!(app_handle, "clipboard_history", tr(lang, "剪贴板历史...", "Clipboard History..."))?,
        &m!(app_handle, "plugin_manager", tr(lang, "插件管理...", "Plugin Manager..."))?,
    ])?;

    let tools_menu = Submenu::with_items(app_handle, tr(lang, "工具", "Tools"), true, &[
        &m!(app_handle, "text_transform", tr(lang, "文本转换...", "Text Transform..."), a("CmdOrControl+Shift+R"))?,
        &m!(app_handle, "macro_start_stop", tr(lang, "开始/停止录制宏", "Start/Stop Macro Recording"))?,
        &m!(app_handle, "macro_playback", tr(lang, "播放宏", "Playback Macro"))?,
        &m!(app_handle, "run_macro_multiple", tr(lang, "多次运行宏...", "Run Macro Multiple..."))?,
        &m!(app_handle, "macro_save", tr(lang, "保存当前录制的宏", "Save Current Macro"))?,
    ])?;

    let compare_menu = Submenu::with_items(app_handle, tr(lang, "对比", "Compare"), true, &[
        &m!(app_handle, "compare_start", tr(lang, "开始对比...", "Start Compare..."))?,
        &m!(app_handle, "compare_clear", tr(lang, "清除对比", "Clear Compare"))?,
        &m!(app_handle, "compare_sync_scroll", tr(lang, "同步滚动", "Sync Scroll"))?,
        &m!(app_handle, "compare_next_diff", tr(lang, "下一差异", "Next Difference"))?,
        &m!(app_handle, "compare_prev_diff", tr(lang, "上一差异", "Previous Difference"))?,
    ])?;

    let help_menu = Submenu::with_items(app_handle, tr(lang, "帮助", "Help"), true, &[
        &m!(app_handle, "about", tr(lang, "关于 MarkPT", "About MarkPT"))?,
    ])?;

    let menu = Menu::with_items(app_handle, &[
        &file_menu, &edit_menu, &search_menu, &view_menu,
        &encoding_menu, &language_menu, &settings_menu, &tools_menu,
        &compare_menu, &help_menu,
    ])?;
    app_handle.set_menu(menu)?;
    Ok(())
}

#[tauri::command]
pub fn rebuild_menu(app: AppHandle, lang: String) {
    let _ = build_menu(&app, &lang);
    let _ = app.emit("menu-rebuilt", &lang);
}
