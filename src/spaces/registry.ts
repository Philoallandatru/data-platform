import React, { lazy } from 'react';

export interface SpaceMeta {
  id: string;
  title: string;
  author: string;
  team: string;
  description: string;
  tags: string[];
}

export interface RegisteredSpace extends SpaceMeta {
  Component: React.LazyExoticComponent<React.ComponentType>;
}

const metaModules = import.meta.glob<{ meta: SpaceMeta }>('./*/meta.ts', { eager: true });
const pageModules = import.meta.glob<{ default: React.ComponentType }>('./*/index.tsx');

export const REGISTERED_SPACES: RegisteredSpace[] = Object.entries(metaModules)
  .map(([metaPath, mod]) => {
    const folder = metaPath.replace('/meta.ts', '');
    const pageLoader = pageModules[`${folder}/index.tsx`];
    if (!mod?.meta || !pageLoader) return null;
    return {
      ...mod.meta,
      Component: lazy(pageLoader),
    };
  })
  .filter((s): s is RegisteredSpace => Boolean(s));
