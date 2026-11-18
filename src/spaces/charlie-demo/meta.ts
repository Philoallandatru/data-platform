import type { SpaceMeta } from '../registry';

export const meta: SpaceMeta = {
  id: 'charlie-demo',
  title: 'Fault Isolation & ErrorBoundary Demo',
  author: 'Charlie',
  team: 'Platform Sandbox',
  description: '演示当某个成员页面发生运行时崩溃时，SpaceErrorBoundary 如何隔离故障而不影响主站。',
  tags: ['Sandbox', 'ErrorBoundary', 'Isolation'],
};
