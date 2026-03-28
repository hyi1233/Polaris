import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { TodoItem } from '../types/todo'
import { WorkspaceTodoRepository } from './todoRepository'

class MemoryFileAccess {
  private readonly files = new Map<string, string>()

  constructor(initialFiles: Record<string, string> = {}) {
    for (const [path, content] of Object.entries(initialFiles)) {
      this.files.set(path, content)
    }
  }

  async pathExists(path: string): Promise<boolean> {
    return this.files.has(path)
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path)
    if (content === undefined) {
      throw new Error(`file not found: ${path}`)
    }
    return content
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content)
  }

  get(path: string): string | undefined {
    return this.files.get(path)
  }
}

function createNodeFileAccess() {
  return {
    async pathExists(filePath: string): Promise<boolean> {
      try {
        await readFile(filePath, 'utf8')
        return true
      } catch {
        return false
      }
    },
    async readFile(filePath: string): Promise<string> {
      return readFile(filePath, 'utf8')
    },
    async writeFile(filePath: string, content: string): Promise<void> {
      await mkdir(path.dirname(filePath), { recursive: true })
      await writeFile(filePath, content, 'utf8')
    },
  }
}

function createTodo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 'todo-1',
    content: 'Test todo',
    status: 'pending',
    priority: 'normal',
    createdAt: '2026-03-28T10:00:00.000Z',
    updatedAt: '2026-03-28T10:00:00.000Z',
    ...overrides,
  }
}

describe('WorkspaceTodoRepository', () => {
  it('creates an empty todo file when missing', async () => {
    const fileAccess = new MemoryFileAccess()
    const repository = new WorkspaceTodoRepository('/workspace', fileAccess)

    const todos = await repository.listTodos()

    expect(todos).toEqual([])
    expect(fileAccess.get('/workspace/.polaris/todos.json')).toContain('"todos": []')
  })

  it('creates a todo and persists it', async () => {
    const fileAccess = new MemoryFileAccess()
    const repository = new WorkspaceTodoRepository('/workspace', fileAccess)

    const todo = await repository.createTodo({
      content: 'Ship MCP todo server',
      priority: 'high',
      tags: ['mcp'],
    })

    expect(todo.content).toBe('Ship MCP todo server')
    expect(todo.status).toBe('pending')

    const stored = JSON.parse(fileAccess.get('/workspace/.polaris/todos.json') ?? '{}')
    expect(stored.todos).toHaveLength(1)
    expect(stored.todos[0].content).toBe('Ship MCP todo server')
  })

  it('updates status and sets completedAt when completing', async () => {
    const fileAccess = new MemoryFileAccess({
      '/workspace/.polaris/todos.json': JSON.stringify({
        version: '1.0.0',
        updatedAt: '2026-03-28T10:00:00.000Z',
        todos: [createTodo()],
      }),
    })
    const repository = new WorkspaceTodoRepository('/workspace', fileAccess)

    const updated = await repository.updateTodo('todo-1', {
      status: 'completed',
      lastProgress: 'done',
    })

    expect(updated.status).toBe('completed')
    expect(updated.completedAt).toBeTruthy()
    expect(updated.lastProgress).toBe('done')
  })

  it('deletes a todo', async () => {
    const fileAccess = new MemoryFileAccess({
      '/workspace/.polaris/todos.json': JSON.stringify({
        version: '1.0.0',
        updatedAt: '2026-03-28T10:00:00.000Z',
        todos: [createTodo()],
      }),
    })
    const repository = new WorkspaceTodoRepository('/workspace', fileAccess)

    const deleted = await repository.deleteTodo('todo-1')
    const remaining = await repository.listTodos()

    expect(deleted.id).toBe('todo-1')
    expect(remaining).toEqual([])
  })

  it('normalizes malformed todo file entries', async () => {
    const fileAccess = new MemoryFileAccess({
      '/workspace/.polaris/todos.json': JSON.stringify({
        todos: [
          { id: 'ok', content: 'Valid', status: 'pending', priority: 'normal', createdAt: 'x', updatedAt: 'y' },
          { id: 'bad', content: '', status: 'pending', priority: 'normal' },
          { content: 'Recovered', status: 'weird', priority: 'unknown' },
        ],
      }),
    })
    const repository = new WorkspaceTodoRepository('/workspace', fileAccess)

    const todos = await repository.listTodos()

    expect(todos).toHaveLength(2)
    expect(todos[1].content).toBe('Recovered')
    expect(todos[1].status).toBe('pending')
    expect(todos[1].priority).toBe('normal')
  })

  it('creates parent directories when using Node file access', async () => {
    const tempWorkspace = await mkdtemp(path.join(os.tmpdir(), 'polaris-todo-repo-'))

    try {
      const repository = new WorkspaceTodoRepository(tempWorkspace, createNodeFileAccess())

      const todo = await repository.createTodo({
        content: 'Node runtime todo',
        description: 'created through Node file access',
      })

      const todoFilePath = path.join(tempWorkspace, '.polaris', 'todos.json')
      const stored = JSON.parse(await readFile(todoFilePath, 'utf8'))

      expect(todo.content).toBe('Node runtime todo')
      expect(stored.todos).toHaveLength(1)
      expect(stored.todos[0].description).toBe('created through Node file access')
    } finally {
      await rm(tempWorkspace, { recursive: true, force: true })
    }
  })
})
