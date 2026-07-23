import { create } from 'zustand';

interface ResearchFilesState {
  availableFiles: string[];
  isLoading: boolean;
  hasError: boolean;
}

interface ResearchFilesActions {
  setAvailableFiles: (files: string[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (hasError: boolean) => void;
  fetchFiles: () => Promise<void>;
}

type ResearchFilesStore = ResearchFilesState & ResearchFilesActions;

export const useResearchFilesStore = create<ResearchFilesStore>((set) => ({
  availableFiles: [],
  isLoading: false,
  hasError: false,
  setAvailableFiles: (files) => set({ availableFiles: files }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (hasError) => set({ hasError }),
  fetchFiles: async () => {
    set({ isLoading: true, hasError: false });
    try {
      const res = await fetch('/api/research-files');
      const data = await res.json();
      set({ availableFiles: data.files, isLoading: false });
    } catch {
      set({ hasError: true, isLoading: false });
    }
  },
}));
