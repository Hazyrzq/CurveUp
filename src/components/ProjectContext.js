'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ProjectContext = createContext(null);

function asId(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const selectProject = useCallback((id) => {
    const next = asId(id);
    setSelectedId(next);
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/proyek');
      const json = await res.json();
      const list = (json.success ? json.data || [] : []).map((p) => ({ ...p, id: asId(p.id) }));
      setProjects(list);

      setSelectedId((current) => {
        if (current && list.some((p) => p.id === current)) return current;
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
