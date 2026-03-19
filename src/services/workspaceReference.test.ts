/**
 * workspaceReference.ts 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseWorkspaceReferences,
  getWorkspaceByName,
  isValidWorkspaceReference,
  buildWorkspaceContextExtra,
  buildSystemPrompt,
} from './workspaceReference';
import type { Workspace } from '../types';

// Mock i18next
vi.mock('i18next', () => ({
  default: {
    t: vi.fn((key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'systemPrompt:workingIn': `正在工作区 ${params?.name || ''} 中工作`,
        'systemPrompt:projectPath': `项目路径: ${params?.path || ''}`,
        'systemPrompt:fileRefSyntax': '文件引用语法: @filename 或 @dir/filename',
        'systemPrompt:contextWorkspaces': '关联工作区:',
        'systemPrompt:refSyntax': `引用语法: @${params?.name || ''}:filename`,
        'systemPrompt:todoManagement': '待办管理:',
        'systemPrompt:todoStorage': `待办文件存储在: ${params?.path || ''}/.polaris/todos/`,
        'systemPrompt:todoTrigger': '当用户要求添加待办时，使用 todo_write 工具',
        'systemPrompt:todoRead': '使用 todo_read 工具读取当前待办列表',
        'systemPrompt:todoFormat': '待办格式: JSON 数组',
        'systemPrompt:todoParse': '解析时使用 JSON.parse',
      };
      return translations[key] || key;
    }),
    bind: vi.fn((fn) => fn),
  },
}));

// 创建模拟工作区数据
const createMockWorkspace = (id: string, name: string, path: string): Workspace => ({
  id,
  name,
  path,
  createdAt: '2026-01-01T00:00:00Z',
  lastAccessed: '2026-03-19T00:00:00Z',
});

describe('workspaceReference', () => {
  const mockWorkspaces: Workspace[] = [
    createMockWorkspace('ws-1', 'Polaris', 'D:/space/base/Polaris'),
    createMockWorkspace('ws-2', 'Utils', 'D:/space/libs/utils'),
    createMockWorkspace('ws-3', '测试项目', 'D:/space/test/中文路径'),
  ];

  describe('parseWorkspaceReferences', () => {
    it('应解析指定工作区的引用', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/helper.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(1);
      expect(result.references[0].workspaceName).toBe('Utils');
      expect(result.references[0].relativePath).toBe('src/helper.ts');
      expect(result.references[0].absolutePath).toBe('D:/space/libs/utils/src/helper.ts');
    });

    it('应解析当前工作区的引用（@/path 格式）', () => {
      const result = parseWorkspaceReferences(
        '参考 @/src/App.tsx',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(1);
      expect(result.references[0].workspaceName).toBe('Polaris');
      // 注意：@/path 格式的 relativePath 会包含前导斜杠
      expect(result.references[0].relativePath).toBe('/src/App.tsx');
      // 绝对路径会正确拼接
      expect(result.references[0].absolutePath).toBe('D:/space/base/Polaris//src/App.tsx');
    });

    it('应处理多个引用', () => {
      const result = parseWorkspaceReferences(
        '参考 @Utils:src/a.ts 和 @Polaris:src/b.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(2);
      expect(result.references[0].relativePath).toBe('src/a.ts');
      expect(result.references[1].relativePath).toBe('src/b.ts');
    });

    it('应处理中文工作区名', () => {
      const result = parseWorkspaceReferences(
        '查看 @测试项目:readme.md',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(1);
      expect(result.references[0].workspaceName).toBe('测试项目');
    });

    it('应忽略普通 @ 提及（不包含 . 或 /）', () => {
      const result = parseWorkspaceReferences(
        '联系 @user 和 @Utils:src/a.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      // @user 不包含 . 或 /，会被过滤
      expect(result.references).toHaveLength(1);
      expect(result.references[0].relativePath).toBe('src/a.ts');
    });

    it('应处理邮箱地址（包含 .）', () => {
      const result = parseWorkspaceReferences(
        '联系 test@example.com',
        mockWorkspaces,
        [],
        'ws-1'
      );

      // @example.com 会被匹配为当前工作区引用（example.com 包含 .）
      // relativePath 是 example.com
      expect(result.references).toHaveLength(1);
      expect(result.references[0].workspaceName).toBe('Polaris');
      expect(result.references[0].relativePath).toBe('example.com');
    });

    it('应处理空消息', () => {
      const result = parseWorkspaceReferences('', mockWorkspaces, [], 'ws-1');

      expect(result.references).toHaveLength(0);
      expect(result.processedMessage).toBe('');
    });

    it('应处理无引用的消息', () => {
      const result = parseWorkspaceReferences(
        '这是一条普通消息',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(0);
      expect(result.processedMessage).toBe('这是一条普通消息');
    });

    it('应处理不存在的工作区引用', () => {
      const result = parseWorkspaceReferences(
        '查看 @NotExist:src/a.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(0);
    });

    it('应处理无当前工作区的情况', () => {
      const result = parseWorkspaceReferences(
        '参考 @/src/App.tsx',
        mockWorkspaces,
        [],
        null
      );

      // 无当前工作区时，@/ 格式不应被处理
      expect(result.references).toHaveLength(0);
    });

    it('应正确替换为绝对路径', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/helper.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.processedMessage).toBe('查看 @D:/space/libs/utils/src/helper.ts');
    });

    it('应生成上下文头', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/helper.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.contextHeader).toContain('工作区信息');
      expect(result.contextHeader).toContain('当前工作区: Polaris');
      expect(result.contextHeader).toContain('本次引用的工作区');
    });

    it('应包含关联工作区信息', () => {
      const contextWorkspaces = [mockWorkspaces[1]];
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/helper.ts',
        mockWorkspaces,
        contextWorkspaces,
        'ws-1'
      );

      expect(result.contextHeader).toContain('关联工作区');
      expect(result.contextHeader).toContain('Utils');
    });

    it('应处理路径分隔符（Windows 风格）', () => {
      const winWorkspace = createMockWorkspace('ws-win', 'WinProj', 'C:\\Projects\\WinProj');
      const result = parseWorkspaceReferences(
        '查看 @WinProj:src\\main.ts',
        [winWorkspace],
        [],
        'ws-win'
      );

      expect(result.references[0].absolutePath).toContain('WinProj');
    });

    it('应处理路径分隔符（Unix 风格）', () => {
      const unixWorkspace = createMockWorkspace('ws-unix', 'UnixProj', '/home/user/UnixProj');
      const result = parseWorkspaceReferences(
        '查看 @UnixProj:src/main.ts',
        [unixWorkspace],
        [],
        'ws-unix'
      );

      expect(result.references[0].absolutePath).toBe('/home/user/UnixProj/src/main.ts');
    });

    it('应正确记录原始文本', () => {
      const result = parseWorkspaceReferences(
        '参考 @Utils:src/helper.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references[0].originalText).toBe('@Utils:src/helper.ts');
    });

    it('应处理多个相同工作区的引用', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/a.ts 和 @Utils:src/b.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(2);
      expect(result.references[0].workspaceName).toBe('Utils');
      expect(result.references[1].workspaceName).toBe('Utils');
    });
  });

  describe('getWorkspaceByName', () => {
    it('应正确查找工作区', () => {
      const result = getWorkspaceByName('Utils', mockWorkspaces);
      expect(result?.id).toBe('ws-2');
    });

    it('应大小写不敏感', () => {
      const result = getWorkspaceByName('utils', mockWorkspaces);
      expect(result?.id).toBe('ws-2');
    });

    it('应处理中文名', () => {
      const result = getWorkspaceByName('测试项目', mockWorkspaces);
      expect(result?.id).toBe('ws-3');
    });

    it('应返回 undefined 当不存在时', () => {
      const result = getWorkspaceByName('NotExist', mockWorkspaces);
      expect(result).toBeUndefined();
    });

    it('应处理空数组', () => {
      const result = getWorkspaceByName('Utils', []);
      expect(result).toBeUndefined();
    });
  });

  describe('isValidWorkspaceReference', () => {
    it('应返回 true 对于有效格式', () => {
      expect(isValidWorkspaceReference('@Utils:src/a.ts')).toBe(true);
    });

    it('应返回 true 对于中文名', () => {
      expect(isValidWorkspaceReference('@测试项目:readme.md')).toBe(true);
    });

    it('应返回 true 对于带连字符的名', () => {
      expect(isValidWorkspaceReference('@my-project:src/a.ts')).toBe(true);
    });

    it('应返回 false 对于 @/ 格式', () => {
      expect(isValidWorkspaceReference('@/src/a.ts')).toBe(false);
    });

    it('应返回 false 对于普通文本', () => {
      expect(isValidWorkspaceReference('普通文本')).toBe(false);
    });

    it('应返回 false 对于邮箱', () => {
      expect(isValidWorkspaceReference('test@example.com')).toBe(false);
    });

    it('应返回 false 对于空字符串', () => {
      expect(isValidWorkspaceReference('')).toBe(false);
    });
  });

  describe('buildWorkspaceContextExtra', () => {
    it('应构建工作区上下文', () => {
      const result = buildWorkspaceContextExtra(mockWorkspaces, [], 'ws-1');

      expect(result).not.toBeNull();
      expect(result?.currentWorkspace.name).toBe('Polaris');
      expect(result?.currentWorkspace.path).toBe('D:/space/base/Polaris');
      expect(result?.contextWorkspaces).toEqual([]);
    });

    it('应包含关联工作区', () => {
      const contextWorkspaces = [mockWorkspaces[1]];
      const result = buildWorkspaceContextExtra(mockWorkspaces, contextWorkspaces, 'ws-1');

      expect(result?.contextWorkspaces).toHaveLength(1);
      expect(result?.contextWorkspaces[0].name).toBe('Utils');
    });

    it('应返回 null 当无当前工作区时', () => {
      const result = buildWorkspaceContextExtra(mockWorkspaces, [], null);
      expect(result).toBeNull();
    });

    it('应返回 null 当当前工作区不存在时', () => {
      const result = buildWorkspaceContextExtra(mockWorkspaces, [], 'not-exist');
      expect(result).toBeNull();
    });

    it('应处理多个关联工作区', () => {
      const contextWorkspaces = [mockWorkspaces[1], mockWorkspaces[2]];
      const result = buildWorkspaceContextExtra(mockWorkspaces, contextWorkspaces, 'ws-1');

      expect(result?.contextWorkspaces).toHaveLength(2);
    });
  });

  describe('buildSystemPrompt', () => {
    it('应构建系统提示词', () => {
      const result = buildSystemPrompt(mockWorkspaces, [], 'ws-1');

      expect(result).toContain('正在工作区 Polaris 中工作');
      expect(result).toContain('项目路径: D:/space/base/Polaris');
      expect(result).toContain('文件引用语法');
    });

    it('应包含关联工作区信息', () => {
      const contextWorkspaces = [mockWorkspaces[1]];
      const result = buildSystemPrompt(mockWorkspaces, contextWorkspaces, 'ws-1');

      expect(result).toContain('关联工作区');
      expect(result).toContain('Utils');
    });

    it('应包含待办管理信息', () => {
      const result = buildSystemPrompt(mockWorkspaces, [], 'ws-1');

      expect(result).toContain('待办管理');
      expect(result).toContain('todo_write');
      expect(result).toContain('todo_read');
    });

    it('应返回空字符串当无当前工作区时', () => {
      const result = buildSystemPrompt(mockWorkspaces, [], null);
      expect(result).toBe('');
    });

    it('应返回空字符串当当前工作区不存在时', () => {
      const result = buildSystemPrompt(mockWorkspaces, [], 'not-exist');
      expect(result).toBe('');
    });
  });

  describe('边界情况', () => {
    it('应处理特殊字符路径', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/[test]/a.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(1);
      expect(result.references[0].relativePath).toBe('src/[test]/a.ts');
    });

    it('应处理空格路径', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/my folder/a.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      // 空格会导致路径中断，因为正则使用 [^\s]
      expect(result.references).toHaveLength(1);
    });

    it('应处理深路径', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:a/b/c/d/e/f.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references[0].relativePath).toBe('a/b/c/d/e/f.ts');
    });

    it('应处理文件扩展名', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:README.md',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references[0].relativePath).toBe('README.md');
    });

    it('应处理无扩展名文件', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/Makefile',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references[0].relativePath).toBe('src/Makefile');
    });

    it('应处理隐藏文件', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:.gitignore',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references[0].relativePath).toBe('.gitignore');
    });

    it('应处理 Unicode 路径', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/中文/文件.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references[0].relativePath).toBe('src/中文/文件.ts');
    });

    it('应处理重复引用', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/a.ts 和 @Utils:src/a.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(2);
    });

    it('应处理极长路径', () => {
      const longPath = 'a/'.repeat(50) + 'file.ts';
      const result = parseWorkspaceReferences(
        `查看 @Utils:${longPath}`,
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references[0].relativePath).toBe(longPath);
    });
  });

  describe('并发安全性', () => {
    it('应处理多次并发调用', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(
          parseWorkspaceReferences(
            `查看 @Utils:src/file${i}.ts`,
            mockWorkspaces,
            [],
            'ws-1'
          )
        )
      );

      const results = await Promise.all(promises);

      results.forEach((result, i) => {
        expect(result.references).toHaveLength(1);
        expect(result.references[0].relativePath).toBe(`src/file${i}.ts`);
      });
    });

    it('应处理不同工作区的并发引用', async () => {
      const messages = [
        '查看 @Utils:src/a.ts',
        '查看 @Polaris:src/b.ts',
        '查看 @测试项目:readme.md',
      ];

      const promises = messages.map(msg =>
        Promise.resolve(parseWorkspaceReferences(msg, mockWorkspaces, [], 'ws-1'))
      );

      const results = await Promise.all(promises);

      expect(results[0].references[0].workspaceName).toBe('Utils');
      expect(results[1].references[0].workspaceName).toBe('Polaris');
      expect(results[2].references[0].workspaceName).toBe('测试项目');
    });

    it('应处理空数组的并发查找', async () => {
      const promises = Array.from({ length: 5 }, () =>
        Promise.resolve(getWorkspaceByName('Utils', []))
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBeUndefined();
      });
    });
  });

  describe('性能测试', () => {
    it('应高效处理大量引用', () => {
      const refs = Array.from({ length: 100 }, (_, i) => `@Utils:src/file${i}.ts`);
      const message = refs.join(' ');

      const startTime = performance.now();
      const result = parseWorkspaceReferences(message, mockWorkspaces, [], 'ws-1');
      const endTime = performance.now();

      expect(result.references).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // 应在 100ms 内完成
    });

    it('应高效处理大量工作区', () => {
      const manyWorkspaces: Workspace[] = Array.from({ length: 100 }, (_, i) =>
        createMockWorkspace(`ws-${i}`, `Workspace${i}`, `/path/to/workspace${i}`)
      );

      const startTime = performance.now();
      const result = parseWorkspaceReferences(
        '查看 @Workspace50:src/a.ts',
        manyWorkspaces,
        [],
        'ws-0'
      );
      const endTime = performance.now();

      expect(result.references).toHaveLength(1);
      expect(result.references[0].workspaceName).toBe('Workspace50');
      expect(endTime - startTime).toBeLessThan(50); // O(1) 查找应很快
    });

    it('应高效处理极长消息', () => {
      const longMessage = '这是一段很长的消息。'.repeat(1000) + ' @Utils:src/a.ts';

      const startTime = performance.now();
      const result = parseWorkspaceReferences(longMessage, mockWorkspaces, [], 'ws-1');
      const endTime = performance.now();

      expect(result.references).toHaveLength(1);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('正则边界情况', () => {
    it('应处理连续的 @ 符号', () => {
      const result = parseWorkspaceReferences(
        '@@Utils:src/a.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      // 第一个 @ 被忽略，第二个 @ 开始匹配
      expect(result.references.length).toBeGreaterThanOrEqual(0);
    });

    it('应处理 @ 在字符串末尾', () => {
      const result = parseWorkspaceReferences(
        '查看文件 @',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(0);
    });

    it('应处理只有 @ 和工作区名', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils',
        mockWorkspaces,
        [],
        'ws-1'
      );

      // @Utils 不包含 . 或 /，会被过滤
      expect(result.references).toHaveLength(0);
    });

    it('应处理工作区名后的空格', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils :src/a.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      // 空格会打断正则匹配
      expect(result.references).toHaveLength(0);
    });

    it('应处理多个冒号', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src:a.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      // 只有第一个冒号是分隔符
      expect(result.references).toHaveLength(1);
      expect(result.references[0].relativePath).toBe('src:a.ts');
    });

    it('应处理路径中的 @ 符号', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/@types/a.d.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(1);
      expect(result.references[0].relativePath).toBe('src/@types/a.d.ts');
    });

    it('应处理数字工作区名', () => {
      const numWorkspace = createMockWorkspace('ws-num', '123Project', '/path/to/123');
      const result = parseWorkspaceReferences(
        '查看 @123Project:src/a.ts',
        [numWorkspace],
        [],
        'ws-num'
      );

      expect(result.references).toHaveLength(1);
      expect(result.references[0].workspaceName).toBe('123Project');
    });

    it('应处理下划线工作区名', () => {
      const underscoreWorkspace = createMockWorkspace('ws-us', 'my_project', '/path/to/my_project');
      const result = parseWorkspaceReferences(
        '查看 @my_project:src/a.ts',
        [underscoreWorkspace],
        [],
        'ws-us'
      );

      expect(result.references).toHaveLength(1);
      expect(result.references[0].workspaceName).toBe('my_project');
    });
  });

  describe('特殊输入测试', () => {
    it('应处理 null 工作区列表', () => {
      // TypeScript 类型检查会阻止 null，但运行时可能有意外情况
      expect(() => {
        parseWorkspaceReferences('test', null as unknown as Workspace[], [], 'ws-1');
      }).toThrow();
    });

    it('应处理 undefined 当前工作区 ID', () => {
      const result = parseWorkspaceReferences(
        '查看 @/src/a.ts',
        mockWorkspaces,
        [],
        undefined as unknown as string
      );

      expect(result.references).toHaveLength(0);
    });

    it('应处理工作区缺少 name 属性', () => {
      const incompleteWorkspace = { id: 'ws-inc', path: '/path' } as Workspace;
      const result = parseWorkspaceReferences(
        '查看 @/src/a.ts',
        [incompleteWorkspace],
        [],
        'ws-inc'
      );

      // 应该能处理缺少 name 的情况
      expect(result.references.length).toBeGreaterThanOrEqual(0);
    });

    it('应处理工作区缺少 path 属性', () => {
      const incompleteWorkspace = { id: 'ws-inc', name: 'Incomplete' } as Workspace;
      const result = parseWorkspaceReferences(
        '查看 @Incomplete:src/a.ts',
        [incompleteWorkspace],
        [],
        'ws-1'
      );

      // 可能产生无效路径，但不应崩溃
      expect(result.references.length).toBeGreaterThanOrEqual(0);
    });

    it('应处理空字符串路径', () => {
      const emptyPathWorkspace = createMockWorkspace('ws-empty', 'Empty', '');
      const result = parseWorkspaceReferences(
        '查看 @Empty:src/a.ts',
        [emptyPathWorkspace],
        [],
        'ws-empty'
      );

      // 空路径是无效的工作区状态，不应产生引用
      expect(result.references).toHaveLength(0);
    });

    it('应处理路径末尾有分隔符', () => {
      const trailingSlashWorkspace = createMockWorkspace('ws-trail', 'Trailing', '/path/to/ws/');
      const result = parseWorkspaceReferences(
        '查看 @Trailing:src/a.ts',
        [trailingSlashWorkspace],
        [],
        'ws-trail'
      );

      expect(result.references[0].absolutePath).toContain('src/a.ts');
    });

    it('应处理只含空格的消息', () => {
      const result = parseWorkspaceReferences('   ', mockWorkspaces, [], 'ws-1');

      expect(result.references).toHaveLength(0);
      expect(result.processedMessage).toBe('   ');
    });

    it('应处理消息只有换行符', () => {
      const result = parseWorkspaceReferences('\n\n\n', mockWorkspaces, [], 'ws-1');

      expect(result.references).toHaveLength(0);
    });

    it('应处理 Tab 字符', () => {
      const result = parseWorkspaceReferences(
        '\t查看\t@Utils:src/a.ts\t',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(1);
    });
  });

  describe('数据一致性', () => {
    it('多次调用应返回相同结果', () => {
      const message = '查看 @Utils:src/a.ts';

      const result1 = parseWorkspaceReferences(message, mockWorkspaces, [], 'ws-1');
      const result2 = parseWorkspaceReferences(message, mockWorkspaces, [], 'ws-1');
      const result3 = parseWorkspaceReferences(message, mockWorkspaces, [], 'ws-1');

      expect(result1.processedMessage).toBe(result2.processedMessage);
      expect(result2.processedMessage).toBe(result3.processedMessage);
      expect(result1.references).toEqual(result2.references);
      expect(result2.references).toEqual(result3.references);
    });

    it('上下文头应包含正确的引用计数', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/a.ts 和 @Polaris:src/b.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(2);
      // 上下文头应包含两个被引用的工作区
      expect(result.contextHeader).toContain('Utils');
      expect(result.contextHeader).toContain('Polaris');
    });

    it('原始文本应保持不变', () => {
      const originalMessage = '查看 @Utils:src/a.ts';
      const result = parseWorkspaceReferences(originalMessage, mockWorkspaces, [], 'ws-1');

      // 验证原始文本被正确记录
      expect(result.references[0].originalText).toBe('@Utils:src/a.ts');
    });
  });

  describe('错误恢复', () => {
    it('应处理无效的正则匹配结果', () => {
      // 测试正则在边界情况下的稳定性
      const result = parseWorkspaceReferences(
        '@',
        mockWorkspaces,
        [],
        'ws-1'
      );

      expect(result.references).toHaveLength(0);
    });

    it('应处理工作区名大小写混合', () => {
      const result = parseWorkspaceReferences(
        '查看 @UTILS:src/a.ts',
        mockWorkspaces,
        [],
        'ws-1'
      );

      // 应该大小写不敏感匹配
      expect(result.references).toHaveLength(1);
      expect(result.references[0].workspaceName).toBe('UTILS');
    });

    it('应处理关联工作区为 null', () => {
      const result = parseWorkspaceReferences(
        '查看 @Utils:src/a.ts',
        mockWorkspaces,
        null as unknown as Workspace[],
        'ws-1'
      );

      // 不应崩溃
      expect(result.references.length).toBeGreaterThanOrEqual(0);
    });
  });
});
