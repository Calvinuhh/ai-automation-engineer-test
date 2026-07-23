import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_REFERENCE_URL = 'https://offers.hike-footwear.com/l/li06';

interface CreateFormState {
  productUrl: string;
  referenceUrl: string;
  researchFilePath: string;
  uploadedFileName: string | null;
  uploadError: string | null;
  uploading: boolean;
  isLoading: boolean;
  error: string | null;
  sessionToken: string;
}

interface CreateFormActions {
  setProductUrl: (url: string) => void;
  setReferenceUrl: (url: string) => void;
  setResearchFilePath: (path: string) => void;
  setUploadedFileInfo: (path: string, name: string) => void;
  setUploadError: (error: string | null) => void;
  setUploading: (uploading: boolean) => void;
  resetUpload: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetForm: () => void;
  setSessionToken: (token: string) => void;
}

type CreateFormStore = CreateFormState & CreateFormActions;

const initialState: Omit<CreateFormState, 'sessionToken'> = {
  productUrl: '',
  referenceUrl: DEFAULT_REFERENCE_URL,
  researchFilePath: '',
  uploadedFileName: null,
  uploadError: null,
  uploading: false,
  isLoading: false,
  error: null,
};

function generateSessionToken(): string {
  return crypto.randomUUID();
}

export const useCreateFormStore = create<CreateFormStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      sessionToken: generateSessionToken(),
      setProductUrl: (url) => set({ productUrl: url }),
      setReferenceUrl: (url) => set({ referenceUrl: url }),
      setResearchFilePath: (path) => set({ researchFilePath: path }),
      setUploadedFileInfo: (path, name) =>
        set({
          researchFilePath: path,
          uploadedFileName: name,
          uploadError: null,
          uploading: false,
        }),
      setUploadError: (error) => set({ uploadError: error, uploading: false }),
      setUploading: (uploading) => set({ uploading, uploadError: null }),
      resetUpload: async () => {
        const { sessionToken } = get();
        set({ researchFilePath: '', uploadedFileName: null, uploadError: null, uploading: false });
        try {
          await fetch(`/api/research-files?sessionToken=${encodeURIComponent(sessionToken)}`, {
            method: 'DELETE',
          });
        } catch {
          // Ignore deletion errors
        }
      },
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      resetForm: () => set({ ...initialState, sessionToken: generateSessionToken() }),
      setSessionToken: (token) => set({ sessionToken: token }),
    }),
    {
      name: 'listicle-create-form',
      partialize: (state) => ({ sessionToken: state.sessionToken }),
    }
  )
);
