use tauri::{Listener, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_safe_area_insets_css::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            app.listen("frontend-ready", move |_| {
                if let Some(splashscreen) = app_handle.get_webview_window("splashscreen") {
                    let _ = splashscreen.close();
                }
                if let Some(main_window) = app_handle.get_webview_window("main") {
                    let _ = main_window.show();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
