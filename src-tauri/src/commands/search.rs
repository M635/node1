use crate::models::file_meta::{SearchResult, SearchSummary};
use regex::Regex;
use std::fs;
use std::sync::Arc;
use walkdir::WalkDir;
use rayon::iter::{IntoParallelRefIterator, ParallelIterator};

const MAX_RESULTS: usize = 5000;
const MAX_LINE_LENGTH: usize = 500;

/// Per-file search result, collected in parallel and merged afterward.
struct FileSearchResult {
    path: String,
    matches: Vec<SearchResult>,
    match_count: u64,
}

#[tauri::command]
pub fn find_in_files(
    directory: String,
    pattern: String,
    is_regex: bool,
    case_sensitive: bool,
    file_extensions: Option<Vec<String>>,
) -> Result<SearchSummary, String> {
    let regex_pattern = if is_regex {
        pattern.clone()
    } else {
        regex::escape(&pattern)
    };

    let flags = if case_sensitive { "" } else { "(?i)" };
    let full_pattern = format!("{}{}", flags, regex_pattern);
    let re = Arc::new(
        Regex::new(&full_pattern).map_err(|e| format!("正则表达式错误: {}", e))?,
    );

    // Pre-build extension filter once
    let ext_filter = file_extensions.map(|exts| {
        exts.iter()
            .map(|e| {
                let lower = e.to_lowercase();
                if lower.starts_with('.') {
                    lower
                } else {
                    format!(".{}", lower)
                }
            })
            .collect::<Vec<_>>()
    });

    // Collect candidate file paths
    let entries: Vec<_> = WalkDir::new(&directory)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .collect();

    // Process files in parallel using rayon
    let results: Vec<FileSearchResult> = entries
        .par_iter()
        .map(|entry| {
            let path = entry.path();
            let path_str = path.to_string_lossy().to_string();

            // Apply extension filter
            if let Some(ref filter) = ext_filter {
                let ext = path
                    .extension()
                    .map(|e| format!(".{}", e.to_string_lossy().to_lowercase()))
                    .unwrap_or_default();
                if !filter.contains(&ext) {
                    return None;
                }
            }

            let content = match fs::read_to_string(path) {
                Ok(c) => c,
                Err(_) => return None,
            };

            let mut matches = Vec::new();
            let mut match_count = 0u64;
            for (line_idx, line) in content.lines().enumerate() {
                if line.len() > MAX_LINE_LENGTH * 2 {
                    continue;
                }
                for mat in re.find_iter(line) {
                    match_count += 1;
                    if matches.len() < MAX_RESULTS {
                        let line_content = if line.len() > MAX_LINE_LENGTH {
                            format!("{}...", &line[..MAX_LINE_LENGTH])
                        } else {
                            line.to_string()
                        };
                        matches.push(SearchResult {
                            path: path_str.clone(),
                            line_number: (line_idx + 1) as u64,
                            line_content,
                            match_start: mat.start(),
                            match_end: mat.end(),
                        });
                    }
                }
            }

            Some(FileSearchResult {
                path: path_str,
                matches,
                match_count,
            })
        })
        .filter_map(|r| r)
        .collect();

    // Merge results from all threads
    let mut all_matches: Vec<SearchResult> = Vec::with_capacity(MAX_RESULTS);
    let mut total_matches = 0u64;
    let mut files_matched = 0u64;
    let mut truncated = false;

    for file_result in results {
        if file_result.match_count == 0 {
            continue;
        }
        files_matched += 1;
        total_matches += file_result.match_count;

        let remaining = MAX_RESULTS - all_matches.len();
        if remaining <= 0 {
            truncated = true;
            break;
        }
        let take = file_result.matches.len().min(remaining);
        all_matches.extend_from_slice(&file_result.matches[..take]);
        if file_result.matches.len() > remaining {
            truncated = true;
        }
    }

    if all_matches.len() >= MAX_RESULTS {
        truncated = true;
    }

    Ok(SearchSummary {
        total_matches,
        files_matched,
        results: all_matches,
        truncated,
    })
}

#[tauri::command]
pub fn search_in_file(
    path: String,
    pattern: String,
    is_regex: bool,
    case_sensitive: bool,
) -> Result<SearchSummary, String> {
    let regex_pattern = if is_regex {
        pattern.clone()
    } else {
        regex::escape(&pattern)
    };

    let flags = if case_sensitive { "" } else { "(?i)" };
    let full_pattern = format!("{}{}", flags, regex_pattern);
    let re = Regex::new(&full_pattern).map_err(|e| format!("正则表达式错误: {}", e))?;

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    let mut total_matches = 0u64;

    for (line_idx, line) in content.lines().enumerate() {
        for mat in re.find_iter(line) {
            if results.len() >= MAX_RESULTS {
                break;
            }
            results.push(SearchResult {
                path: path.clone(),
                line_number: (line_idx + 1) as u64,
                line_content: line.to_string(),
                match_start: mat.start(),
                match_end: mat.end(),
            });
            total_matches += 1;
        }
        if results.len() >= MAX_RESULTS {
            break;
        }
    }

    let results_len = results.len();
    Ok(SearchSummary {
        total_matches,
        files_matched: if total_matches > 0 { 1 } else { 0 },
        results,
        truncated: results_len >= MAX_RESULTS,
    })
}
