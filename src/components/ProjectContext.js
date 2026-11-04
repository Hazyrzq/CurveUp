'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ProjectContext = createContext(null);

function asId(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const STORAGE_KEY = 'curveup_selected_proyek_id';

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === 'undefined') return null;
    return asId(sessionStorage.getItem(STORAGE_KEY));
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const selectProject = useCallback((id) => {
    const next = asId(id);
    setSelectedId(next);
    if (typeof window !== 'undefined') {
      if (next) sessionStorage.setItem(STORAGE_KEY, String(next));
      else sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/proyek');
      const json = await res.json();
      const list = (json.success ? json.data || [] : []).map((p) => ({ ...p, id: asId(p.id) }));
      setProjects(list);

      setSelectedId((current) => {
        const stored = typeof window !== 'undefined' ? asId(sessionStorage.getItem(STORAGE_KEY)) : null;
        const candidate = current || stored;
        if (candidate && list.some((p) => p.id === candidate)) return candidate;
        if (typeof window !== 'undefined') sessionStorage.removeItem(STORAGE_KEY);
        return null;
      });
    } catch (e) {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        String(p.nama_proyek).toLowerCase().includes(q) ||
        String(p.lokasi || '').toLowerCase().includes(q)
    );
  }, [projects, search]);

  const selected = projects.find((p) => p.id === selectedId) || null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        filtered,
        selected,
        selectedId,
        search,
        setSearch,
        loading,
        selectProject,
        reload: loadProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used in ProjectProvider');
  return ctx;
}
