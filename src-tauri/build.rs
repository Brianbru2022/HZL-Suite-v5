fn main() {
    println!("cargo:rerun-if-changed=../dist");
    if std::env::var("PROFILE").as_deref() == Ok("release")
        && std::env::var("DEP_TAURI_DEV").as_deref() != Ok("false")
    {
        panic!("Release builds must embed the frontend: use the Tauri build command or cargo build --release --features custom-protocol.");
    }
    tauri_build::build()
}
