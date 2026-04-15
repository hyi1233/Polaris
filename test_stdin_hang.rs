// test_stdin_hang.rs - 模拟代码中 stdin 保持打开的行为
// cargo run --bin test_stdin_hang

use std::io::Write;
use std::process::{Command, Stdio};

fn main() {
    let message = r#"{"type":"user","message":{"role":"user","content":[{"type":"text","text":"say hi in one word"}]}}"#;

    let mut child = Command::new("claude")
        .args([
            "--print",
            "--verbose",
            "--output-format",
            "stream-json",
            "--input-format",
            "stream-json",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("Failed to start claude");

    let pid = child.id();
    println!("PID: {}", pid);

    // 发送消息到 stdin
    let mut stdin = child.stdin.take().expect("Failed to get stdin");
    stdin.write_all(message.as_bytes()).unwrap();
    stdin.write_all(b"\n").unwrap();
    stdin.flush().unwrap();
    println!("Message sent to stdin");

    // 关键：不 drop stdin，不关闭管道 —— 模拟代码中的行为
    // （代码中 stdin_writer 被 stdin 写入线程持有，永远不会 drop）

    // 等待 25 秒看进程是否退出
    println!("Waiting 25s (stdin stays OPEN, simulating the bug)...");
    std::thread::sleep(std::time::Duration::from_secs(25));

    // 检查进程是否还在运行
    match child.try_wait() {
        Ok(Some(status)) => {
            println!("EXITED with status: {} (no bug in this scenario)", status);
        }
        Ok(None) => {
            println!("STILL RUNNING after 25s - BUG CONFIRMED!");
            println!("stdin is still open, CLI keeps waiting for more input.");
            // 现在 drop stdin，模拟修复
            drop(stdin);
            println!("stdin dropped (closed), waiting for CLI to exit...");
            let _ = child.wait();
            println!("CLI exited after stdin was closed.");
        }
        Err(e) => {
            println!("Error checking status: {}", e);
        }
    }
}
