use std::collections::BTreeMap;
use std::io::{self, BufRead, BufReader, Write};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::error::{AppError, Result};
use crate::models::todo::{TodoCreateParams, TodoPriority, TodoStatus, TodoUpdateParams};
use crate::services::todo_repository::WorkspaceTodoRepository;

const SERVER_NAME: &str = "polaris-todo-mcp";
const SERVER_VERSION: &str = "0.1.0";
const PROTOCOL_VERSION: &str = "2024-11-05";

#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Debug, Serialize)]
struct JsonRpcResponse<'a> {
    jsonrpc: &'a str,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
struct JsonRpcError {
    code: i32,
    message: String,
}

pub fn run_todo_mcp_server(workspace_path: &str) -> Result<()> {
    let workspace_path = normalize_workspace_path(workspace_path)?;
    let repository = WorkspaceTodoRepository::new(workspace_path);

    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut reader = BufReader::new(stdin.lock());
    let mut writer = stdout.lock();

    let mut line = String::new();
    loop {
        line.clear();
        let bytes_read = reader.read_line(&mut line)?;
        if bytes_read == 0 {
            break;
        }

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let response = match serde_json::from_str::<JsonRpcRequest>(trimmed) {
            Ok(request) => handle_request(request, &repository),
            Err(error) => JsonRpcResponse {
                jsonrpc: "2.0",
                id: Value::Null,
                result: None,
                error: Some(JsonRpcError {
                    code: -32700,
                    message: format!("Parse error: {}", error),
                }),
            },
        };

        serde_json::to_writer(&mut writer, &response)?;
        writer.write_all(b"\n")?;
        writer.flush()?;
    }

    Ok(())
}

fn handle_request(request: JsonRpcRequest, repository: &WorkspaceTodoRepository) -> JsonRpcResponse<'static> {
    let id = request.id.unwrap_or(Value::Null);

    if request.jsonrpc != "2.0" {
        return error_response(id, -32600, "Invalid Request: jsonrpc must be 2.0".to_string());
    }

    let result = match request.method.as_str() {
        "initialize" => handle_initialize(),
        "notifications/initialized" => Ok(json!({})),
        "ping" => Ok(json!({})),
        "tools/list" => Ok(handle_tools_list()),
        "tools/call" => handle_tools_call(request.params, repository),
        _ => Err(AppError::ValidationError(format!("Unsupported method: {}", request.method))),
    };

    match result {
        Ok(result) => JsonRpcResponse {
            jsonrpc: "2.0",
            id,
            result: Some(result),
            error: None,
        },
        Err(error) => error_response(id, -32000, error.to_message()),
    }
}

fn handle_initialize() -> Result<Value> {
    Ok(json!({
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": {
            "tools": {}
        },
        "serverInfo": {
            "name": SERVER_NAME,
            "version": SERVER_VERSION
        }
    }))
}

fn handle_tools_list() -> Value {
    json!({
        "tools": [
            {
                "name": "list_todos",
                "description": "列出当前工作区的待办事项。",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "status": { "type": "string", "enum": ["pending", "in_progress", "completed", "cancelled"] },
                        "priority": { "type": "string", "enum": ["low", "normal", "high", "urgent"] },
                        "limit": { "type": "integer", "minimum": 1, "maximum": 200 }
                    },
                    "additionalProperties": false
                }
            },
            {
                "name": "create_todo",
                "description": "在当前工作区创建一条新待办事项。",
                "inputSchema": {
                    "type": "object",
                    "required": ["content"],
                    "properties": {
                        "content": { "type": "string", "minLength": 1 },
                        "description": { "type": "string" },
                        "priority": { "type": "string", "enum": ["low", "normal", "high", "urgent"] },
                        "tags": { "type": "array", "items": { "type": "string", "minLength": 1 } },
                        "relatedFiles": { "type": "array", "items": { "type": "string", "minLength": 1 } },
                        "dueDate": { "type": "string" },
                        "estimatedHours": { "type": "number", "exclusiveMinimum": 0 }
                    },
                    "additionalProperties": false
                }
            },
            {
                "name": "update_todo",
                "description": "更新当前工作区的一条待办事项。",
                "inputSchema": {
                    "type": "object",
                    "required": ["id"],
                    "properties": {
                        "id": { "type": "string", "minLength": 1 },
                        "content": { "type": "string" },
                        "description": { "type": "string" },
                        "status": { "type": "string", "enum": ["pending", "in_progress", "completed", "cancelled"] },
                        "priority": { "type": "string", "enum": ["low", "normal", "high", "urgent"] },
                        "tags": { "type": "array", "items": { "type": "string", "minLength": 1 } },
                        "relatedFiles": { "type": "array", "items": { "type": "string", "minLength": 1 } },
                        "dueDate": { "type": "string" },
                        "estimatedHours": { "type": "number", "exclusiveMinimum": 0 },
                        "spentHours": { "type": "number", "minimum": 0 },
                        "reminderTime": { "type": "string" },
                        "dependsOn": { "type": "array", "items": { "type": "string", "minLength": 1 } },
                        "lastProgress": { "type": "string" },
                        "lastError": { "type": "string" }
                    },
                    "additionalProperties": false
                }
            },
            {
                "name": "delete_todo",
                "description": "删除当前工作区的一条待办事项。",
                "inputSchema": {
                    "type": "object",
                    "required": ["id"],
                    "properties": {
                        "id": { "type": "string", "minLength": 1 }
                    },
                    "additionalProperties": false
                }
            },
            {
                "name": "start_todo",
                "description": "把待办标记为进行中。",
                "inputSchema": {
                    "type": "object",
                    "required": ["id"],
                    "properties": {
                        "id": { "type": "string", "minLength": 1 },
                        "lastProgress": { "type": "string" }
                    },
                    "additionalProperties": false
                }
            },
            {
                "name": "complete_todo",
                "description": "把待办标记为已完成。",
                "inputSchema": {
                    "type": "object",
                    "required": ["id"],
                    "properties": {
                        "id": { "type": "string", "minLength": 1 },
                        "lastProgress": { "type": "string" }
                    },
                    "additionalProperties": false
                }
            }
        ]
    })
}

fn handle_tools_call(params: Value, repository: &WorkspaceTodoRepository) -> Result<Value> {
    let name = params
        .get("name")
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::ValidationError("tools/call 缺少 name".to_string()))?;
    let arguments = params.get("arguments").cloned().unwrap_or_else(|| json!({}));
    let workspace_path = repository
        .file_path()
        .parent()
        .and_then(|parent| parent.parent())
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_default();

    match name {
        "list_todos" => {
            let args = parse_list_todos_args(arguments)?;
            let mut todos = repository.list_todos()?;
            if let Some(status) = args.status {
                todos.retain(|todo| todo.status == status);
            }
            if let Some(priority) = args.priority {
                todos.retain(|todo| todo.priority == priority);
            }
            if let Some(limit) = args.limit {
                todos.truncate(limit as usize);
            }

            Ok(tool_success(
                format!("已返回 {} 条待办", todos.len()),
                &workspace_path,
                json!({
                    "workspacePath": workspace_path,
                    "count": todos.len(),
                    "todos": todos,
                }),
            ))
        }
        "create_todo" => {
            let args = parse_create_todo_args(arguments)?;
            let todo = repository.create_todo(args)?;
            Ok(tool_success(
                format!("已创建待办：{}", todo.content),
                &workspace_path,
                json!({
                    "workspacePath": workspace_path,
                    "todo": todo,
                }),
            ))
        }
        "update_todo" => {
            let args = parse_update_todo_args(arguments)?;
            let todo = repository.update_todo(&args.id, args.updates)?;
            Ok(tool_success(
                format!("已更新待办：{}", todo.content),
                &workspace_path,
                json!({
                    "workspacePath": workspace_path,
                    "todo": todo,
                }),
            ))
        }
        "delete_todo" => {
            let id = parse_id_arg(&arguments)?;
            let todo = repository.delete_todo(&id)?;
            Ok(tool_success(
                format!("已删除待办：{}", todo.content),
                &workspace_path,
                json!({
                    "workspacePath": workspace_path,
                    "todo": todo,
                }),
            ))
        }
        "start_todo" => {
            let (id, last_progress) = parse_progress_args(arguments)?;
            let todo = repository.update_todo(
                &id,
                TodoUpdateParams {
                    status: Some(TodoStatus::InProgress),
                    last_progress,
                    ..Default::default()
                },
            )?;
            Ok(tool_success(
                format!("已开始待办：{}", todo.content),
                &workspace_path,
                json!({
                    "workspacePath": workspace_path,
                    "todo": todo,
                }),
            ))
        }
        "complete_todo" => {
            let (id, last_progress) = parse_progress_args(arguments)?;
            let todo = repository.update_todo(
                &id,
                TodoUpdateParams {
                    status: Some(TodoStatus::Completed),
                    last_progress,
                    ..Default::default()
                },
            )?;
            Ok(tool_success(
                format!("已完成待办：{}", todo.content),
                &workspace_path,
                json!({
                    "workspacePath": workspace_path,
                    "todo": todo,
                }),
            ))
        }
        _ => Err(AppError::ValidationError(format!("未知工具: {}", name))),
    }
}

fn tool_success(summary: String, workspace_path: &str, structured_content: Value) -> Value {
    json!({
        "structuredContent": structured_content,
        "content": [
            {
                "type": "text",
                "text": build_summary_text(&summary, workspace_path),
            }
        ]
    })
}

fn build_summary_text(action: &str, workspace_path: &str) -> String {
    format!("{}，工作区：{}", action, workspace_path)
}

fn normalize_workspace_path(workspace_path: &str) -> Result<&str> {
    let normalized = workspace_path.trim();
    if normalized.is_empty() {
        return Err(AppError::ValidationError("workspacePath 不能为空".to_string()));
    }
    Ok(normalized)
}

fn parse_id_arg(arguments: &Value) -> Result<String> {
    let id = arguments
        .get("id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::ValidationError("id 不能为空".to_string()))?;
    Ok(id.to_string())
}

fn parse_progress_args(arguments: Value) -> Result<(String, Option<String>)> {
    let id = parse_id_arg(&arguments)?;
    let last_progress = optional_trimmed_string(arguments.get("lastProgress"));
    Ok((id, last_progress))
}

struct ListTodosArgs {
    status: Option<TodoStatus>,
    priority: Option<TodoPriority>,
    limit: Option<u64>,
}

fn parse_list_todos_args(arguments: Value) -> Result<ListTodosArgs> {
    let status = arguments.get("status").map(parse_status_value).transpose()?;
    let priority = arguments.get("priority").map(parse_priority_value).transpose()?;
    let limit = arguments.get("limit").map(parse_limit_value).transpose()?;
    Ok(ListTodosArgs { status, priority, limit })
}

fn parse_create_todo_args(arguments: Value) -> Result<TodoCreateParams> {
    let content = arguments
        .get("content")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::ValidationError("content 不能为空".to_string()))?
        .to_string();

    let estimated_hours = arguments
        .get("estimatedHours")
        .map(parse_positive_number)
        .transpose()?;

    Ok(TodoCreateParams {
        content,
        description: optional_trimmed_string(arguments.get("description")),
        priority: arguments.get("priority").map(parse_priority_value).transpose()?,
        tags: optional_string_array(arguments.get("tags"))?,
        related_files: optional_string_array(arguments.get("relatedFiles"))?,
        due_date: optional_trimmed_string(arguments.get("dueDate")),
        estimated_hours,
        ..Default::default()
    })
}

struct UpdateTodoArgs {
    id: String,
    updates: TodoUpdateParams,
}

fn parse_update_todo_args(arguments: Value) -> Result<UpdateTodoArgs> {
    let id = parse_id_arg(&arguments)?;
    let estimated_hours = arguments
        .get("estimatedHours")
        .map(parse_positive_number)
        .transpose()?;
    let spent_hours = arguments
        .get("spentHours")
        .map(parse_non_negative_number)
        .transpose()?;

    Ok(UpdateTodoArgs {
        id,
        updates: TodoUpdateParams {
            content: optional_trimmed_string(arguments.get("content")),
            description: optional_trimmed_string(arguments.get("description")),
            status: arguments.get("status").map(parse_status_value).transpose()?,
            priority: arguments.get("priority").map(parse_priority_value).transpose()?,
            tags: optional_string_array(arguments.get("tags"))?,
            related_files: optional_string_array(arguments.get("relatedFiles"))?,
            due_date: optional_trimmed_string(arguments.get("dueDate")),
            estimated_hours,
            spent_hours,
            reminder_time: optional_trimmed_string(arguments.get("reminderTime")),
            depends_on: optional_string_array(arguments.get("dependsOn"))?,
            last_progress: optional_trimmed_string(arguments.get("lastProgress")),
            last_error: optional_trimmed_string(arguments.get("lastError")),
            ..Default::default()
        },
    })
}

fn parse_limit_value(value: &Value) -> Result<u64> {
    let limit = value
        .as_u64()
        .ok_or_else(|| AppError::ValidationError("limit 必须是正整数".to_string()))?;
    if limit == 0 || limit > 200 {
        return Err(AppError::ValidationError("limit 必须在 1 到 200 之间".to_string()));
    }
    Ok(limit)
}

fn parse_positive_number(value: &Value) -> Result<f64> {
    let number = value
        .as_f64()
        .ok_or_else(|| AppError::ValidationError("数值字段必须是数字".to_string()))?;
    if number <= 0.0 {
        return Err(AppError::ValidationError("数值字段必须大于 0".to_string()));
    }
    Ok(number)
}

fn parse_non_negative_number(value: &Value) -> Result<f64> {
    let number = value
        .as_f64()
        .ok_or_else(|| AppError::ValidationError("数值字段必须是数字".to_string()))?;
    if number < 0.0 {
        return Err(AppError::ValidationError("数值字段必须大于等于 0".to_string()));
    }
    Ok(number)
}

fn parse_status_value(value: &Value) -> Result<TodoStatus> {
    match value.as_str() {
        Some("pending") => Ok(TodoStatus::Pending),
        Some("in_progress") => Ok(TodoStatus::InProgress),
        Some("completed") => Ok(TodoStatus::Completed),
        Some("cancelled") => Ok(TodoStatus::Cancelled),
        _ => Err(AppError::ValidationError("status 非法".to_string())),
    }
}

fn parse_priority_value(value: &Value) -> Result<TodoPriority> {
    match value.as_str() {
        Some("low") => Ok(TodoPriority::Low),
        Some("normal") => Ok(TodoPriority::Normal),
        Some("high") => Ok(TodoPriority::High),
        Some("urgent") => Ok(TodoPriority::Urgent),
        _ => Err(AppError::ValidationError("priority 非法".to_string())),
    }
}

fn optional_trimmed_string(value: Option<&Value>) -> Option<String> {
    value
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
}

fn optional_string_array(value: Option<&Value>) -> Result<Option<Vec<String>>> {
    let Some(value) = value else {
        return Ok(None);
    };

    let items = value
        .as_array()
        .ok_or_else(|| AppError::ValidationError("数组字段必须是数组".to_string()))?;

    let values = items
        .iter()
        .map(|item| {
            item.as_str()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(|value| value.to_string())
                .ok_or_else(|| AppError::ValidationError("数组项必须是非空字符串".to_string()))
        })
        .collect::<Result<Vec<_>>>()?;

    if values.is_empty() {
        Ok(None)
    } else {
        Ok(Some(values))
    }
}

fn error_response(id: Value, code: i32, message: String) -> JsonRpcResponse<'static> {
    JsonRpcResponse {
        jsonrpc: "2.0",
        id,
        result: None,
        error: Some(JsonRpcError { code, message }),
    }
}

pub fn current_tool_definitions() -> BTreeMap<&'static str, &'static str> {
    BTreeMap::from([
        ("list_todos", "列出当前工作区的待办事项。"),
        ("create_todo", "在当前工作区创建一条新待办事项。"),
        ("update_todo", "更新当前工作区的一条待办事项。"),
        ("delete_todo", "删除当前工作区的一条待办事项。"),
        ("start_todo", "把待办标记为进行中。"),
        ("complete_todo", "把待办标记为已完成。"),
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_expected_tool_count() {
        let defs = current_tool_definitions();
        assert_eq!(defs.len(), 6);
        assert!(defs.contains_key("create_todo"));
        assert!(defs.contains_key("complete_todo"));
    }

    #[test]
    fn initialize_returns_protocol_metadata() {
        let value = handle_initialize().unwrap();
        assert_eq!(value["protocolVersion"], Value::String(PROTOCOL_VERSION.to_string()));
        assert_eq!(value["serverInfo"]["name"], Value::String(SERVER_NAME.to_string()));
    }

    #[test]
    fn tools_list_contains_create_todo() {
        let value = handle_tools_list();
        let tools = value["tools"].as_array().unwrap();
        assert!(tools.iter().any(|tool| tool["name"] == Value::String("create_todo".to_string())));
    }
}
