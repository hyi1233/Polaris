use polaris_lib::services::todo_mcp_server::run_todo_mcp_server;
use polaris_lib::{AppError, Result};

fn main() {
    if let Err(error) = main_impl() {
        let message = error.to_message();
        eprintln!("{}", message);
        std::process::exit(1);
    }
}

fn main_impl() -> Result<()> {
    let workspace_path = std::env::args().nth(1).unwrap_or_default();
    if workspace_path.trim().is_empty() {
        return Err(AppError::ValidationError(
            "缺少工作区路径参数。用法：polaris-todo-mcp <workspacePath>".to_string(),
        ));
    }

    run_todo_mcp_server(&workspace_path)
}
