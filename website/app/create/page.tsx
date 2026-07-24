'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { DropZone } from '@/components/drop-zone';
import { useCreateFormStore } from '@/lib/stores/createFormStore';

export default function CreatePage() {
  const router = useRouter();

  const {
    productUrl,
    referenceUrl,
    researchFilePath,
    uploadedFileName,
    uploadError,
    uploading,
    isLoading,
    error,
    sessionToken,
    setProductUrl,
    setReferenceUrl,
    setUploadedFileInfo,
    setUploadError,
    setUploading,
    resetUpload,
    setLoading,
    setError,
    resetForm,
  } = useCreateFormStore();

  useEffect(() => {
    const restoreSession = () => {
      const token = useCreateFormStore.getState().sessionToken;
      fetch(`/api/research-files?sessionToken=${encodeURIComponent(token)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.filePath && data.fileName) {
            useCreateFormStore.getState().setUploadedFileInfo(data.filePath, data.fileName);
          }
        })
        .catch(() => {});
    };

    if (useCreateFormStore.persist.hasHydrated()) {
      restoreSession();
      return;
    }

    const unsub = useCreateFormStore.persist.onFinishHydration(() => {
      restoreSession();
    });

    return () => {
      unsub();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/listicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl, referenceUrl, sessionToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create listicle');
        setLoading(false);
        return;
      }

      resetForm();
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  const isFormValid = productUrl && referenceUrl && researchFilePath && !uploading;

  return (
    <>
      <Header />
      <main className="flex-1 bg-zinc-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-zinc-900 mb-8">Create Listicle</h1>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg border border-zinc-200 p-6 space-y-6"
          >
            <div>
              <label
                htmlFor="productUrl"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                Product URL
              </label>
              <input
                id="productUrl"
                type="url"
                required
                maxLength={2048}
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://getwidestep.com/products/widestep-elora-bogo"
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                aria-invalid={error ? 'true' : undefined}
              />
              <p className="mt-1 text-xs text-zinc-500">
                The product page to scrape media assets from.
              </p>
            </div>

            <div>
              <label
                htmlFor="referenceUrl"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                Reference URL
              </label>
              <input
                id="referenceUrl"
                type="url"
                required
                maxLength={2048}
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="https://offers.hike-footwear.com/l/li06"
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                aria-invalid={error ? 'true' : undefined}
              />
              <p className="mt-1 text-xs text-zinc-500">
                The listicle pre-landing page that serves as the design template.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Product Research JSON
              </label>
              <DropZone
                onFileUploaded={setUploadedFileInfo}
                onError={setUploadError}
                onUploadStart={() => setUploading(true)}
                uploadedFileName={uploadedFileName}
                uploadError={uploadError}
                uploading={uploading}
                onReset={resetUpload}
                sessionToken={sessionToken}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Deep product research file (positioning, features, audience, claims, FAQs).
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full py-2.5 px-4 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Listicle'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
