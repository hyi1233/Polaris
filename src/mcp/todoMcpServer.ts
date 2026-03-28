import { access, mkdir, readFile as readTextFile, writeFile as writeTextFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { TodoCreateParams, TodoPriority, TodoStatus, TodoUpdateParams } from '../types/todo.js'
import { WorkspaceTodoRepository } from './todoRepository.js'

const todoPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])
const todoStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled'])

function createRepository(workspacePath: string): WorkspaceTodoRepository {
  return new WorkspaceTodoRepository(workspacePath, {
    async pathExists(filePath) {
      try {
        await access(filePath)
        return true
      } catch {
        return false
      }
    },
    async readFile(filePath) {
      return readTextFile(filePath, 'utf8')
    },
    async writeFile(filePath, content) {
      await mkdir(path.dirname(filePath), { recursive: true })
      await writeTextFile(filePath, content, 'utf8')
    },
  })
}

function normalizeWorkspacePath(workspacePath: string): string {
  const normalized = workspacePath.trim()
  if (!normalized) {
    throw new Error('workspacePath 不能为空')
  }
  return normalized
}

function buildSummaryText(action: string, workspacePath: string): string {
  return `${action}，工作区：${workspacePath}`
}

export function createTodoMcpServer(workspacePath: string) {
  const normalizedWorkspacePath = normalizeWorkspacePath(workspacePath)

  return import('@modelcontextprotocol/sdk/server/mcp.js').then(async ({ McpServer }) => {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js')

    const server = new McpServer({
      name: 'polaris-todo-mcp',
      version: '0.1.0',
    })

    const repository = createRepository(normalizedWorkspacePath)

    server.registerTool(
      'list_todos',
      {
        description: '列出当前工作区的待办事项。',
        inputSchema: {
          status: todoStatusSchema.optional(),
          priority: todoPrioritySchema.optional(),
          limit: z.number().int().positive().max(200).optional(),
        },
      },
      async ({ status, priority, limit }) => {
        let todos = await repository.listTodos()

        if (status) {
          todos = todos.filter(todo => todo.status === status)
        }

        if (priority) {
          todos = todos.filter(todo => todo.priority === priority)
        }

        if (limit !== undefined) {
          todos = todos.slice(0, limit)
        }

        return {
          structuredContent: {
            workspacePath: normalizedWorkspacePath,
            count: todos.length,
            todos,
          },
          content: [
            {
              type: 'text',
              text: buildSummaryText(`已返回 ${todos.length} 条待办`, normalizedWorkspacePath),
            },
          ],
        }
      }
    )

    server.registerTool(
      'create_todo',
      {
        description: '在当前工作区创建一条新待办事项。',
        inputSchema: {
          content: z.string().trim().min(1),
          description: z.string().trim().optional(),
          priority: todoPrioritySchema.optional(),
          tags: z.array(z.string().trim().min(1)).optional(),
          relatedFiles: z.array(z.string().trim().min(1)).optional(),
          dueDate: z.string().trim().optional(),
          estimatedHours: z.number().positive().optional(),
        },
      },
      async (args) => {
        const todo = await repository.createTodo(args satisfies TodoCreateParams)

        return {
          structuredContent: {
            workspacePath: normalizedWorkspacePath,
            todo,
          },
          content: [
            {
              type: 'text',
              text: buildSummaryText(`已创建待办：${todo.content}`, normalizedWorkspacePath),
            },
          ],
        }
      }
    )

    server.registerTool(
      'update_todo',
      {
        description: '更新当前工作区的一条待办事项。',
        inputSchema: {
          id: z.string().trim().min(1),
          content: z.string().trim().optional(),
          description: z.string().trim().optional(),
          status: todoStatusSchema.optional(),
          priority: todoPrioritySchema.optional(),
          tags: z.array(z.string().trim().min(1)).optional(),
          relatedFiles: z.array(z.string().trim().min(1)).optional(),
          dueDate: z.string().trim().optional(),
          estimatedHours: z.number().positive().optional(),
          spentHours: z.number().nonnegative().optional(),
          reminderTime: z.string().trim().optional(),
          dependsOn: z.array(z.string().trim().min(1)).optional(),
          lastProgress: z.string().trim().optional(),
          lastError: z.string().trim().optional(),
        },
      },
      async ({ id, ...updates }) => {
        const todo = await repository.updateTodo(id, updates satisfies TodoUpdateParams)

        return {
          structuredContent: {
            workspacePath: normalizedWorkspacePath,
            todo,
          },
          content: [
            {
              type: 'text',
              text: buildSummaryText(`已更新待办：${todo.content}`, normalizedWorkspacePath),
            },
          ],
        }
      }
    )

    server.registerTool(
      'delete_todo',
      {
        description: '删除当前工作区的一条待办事项。',
        inputSchema: {
          id: z.string().trim().min(1),
        },
      },
      async ({ id }) => {
        const todo = await repository.deleteTodo(id)

        return {
          structuredContent: {
            workspacePath: normalizedWorkspacePath,
            todo,
          },
          content: [
            {
              type: 'text',
              text: buildSummaryText(`已删除待办：${todo.content}`, normalizedWorkspacePath),
            },
          ],
        }
      }
    )

    server.registerTool(
      'start_todo',
      {
        description: '把待办标记为进行中。',
        inputSchema: {
          id: z.string().trim().min(1),
          lastProgress: z.string().trim().optional(),
        },
      },
      async ({ id, lastProgress }) => {
        const todo = await repository.updateTodo(id, {
          status: 'in_progress' satisfies TodoStatus,
          lastProgress,
        })

        return {
          structuredContent: {
            workspacePath: normalizedWorkspacePath,
            todo,
          },
          content: [
            {
              type: 'text',
              text: buildSummaryText(`已开始待办：${todo.content}`, normalizedWorkspacePath),
            },
          ],
        }
      }
    )

    server.registerTool(
      'complete_todo',
      {
        description: '把待办标记为已完成。',
        inputSchema: {
          id: z.string().trim().min(1),
          lastProgress: z.string().trim().optional(),
        },
      },
      async ({ id, lastProgress }) => {
        const todo = await repository.updateTodo(id, {
          status: 'completed' satisfies TodoStatus,
          lastProgress,
        })

        return {
          structuredContent: {
            workspacePath: normalizedWorkspacePath,
            todo,
          },
          content: [
            {
              type: 'text',
              text: buildSummaryText(`已完成待办：${todo.content}`, normalizedWorkspacePath),
            },
          ],
        }
      }
    )

    return {
      server,
      transport: new StdioServerTransport(),
    }
  })
}

export async function startTodoMcpServer(workspacePath: string): Promise<void> {
  const { server, transport } = await createTodoMcpServer(workspacePath)
  await server.connect(transport)
}

export type TodoMcpServerHandle = Awaited<ReturnType<typeof createTodoMcpServer>>
export type TodoMcpPriority = TodoPriority
export type TodoMcpStatus = TodoStatus
