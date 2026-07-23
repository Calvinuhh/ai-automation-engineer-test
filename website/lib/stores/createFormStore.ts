import { create } from 'zustand';

const DEFAULT_REFERENCE_URL = 'https://offers.hike-footwear.com/l/li06';

interface CreateFormState {
  productUrl: string;
  referenceUrl: string;
  researchFileName: string;
  isLoading: boolean;
  error: string | null;
}

interface CreateFormActions {
  setProductUrl: (url: string) => void;
  setReferenceUrl: (url: string) => void;
  setResearchFileName: (name: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetForm: () => void;
}

type CreateFormStore = CreateFormState & CreateFormActions;

const initialState: CreateFormState = {
  productUrl: '',
  referenceUrl: DEFAULT_REFERENCE_URL,
  researchFileName: '',
  isLoading: false,
  error: null,
};

export const useCreateFormStore = create<CreateFormStore>((set) => ({
  ...initialState,
  setProductUrl: (url) => set({ productUrl: url }),
  setReferenceUrl: (url) => set({ referenceUrl: url }),
  setResearchFileName: (name) => set({ researchFileName: name }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  resetForm: () => set(initialState),
}));
