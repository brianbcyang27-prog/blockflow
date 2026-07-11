const NvidiaConfig = (function() {
  const STORAGE_KEYS = {
    model: 'blockflow_nvidia_model',
    proxyUrl: 'blockflow_nvidia_proxy_url'
  };

  const MODEL_OPTIONS = [
    {
      id: 'meta/llama-3.1-8b-instruct',
      label: 'Llama 3.1 8B',
      description: 'Fast general chat'
    },
    {
      id: 'nvidia/llama-3.3-nemotron-super-49b-v1',
      label: 'Nemotron Super 49B',
      description: 'Stronger reasoning'
    },
    {
      id: 'google/gemma-4-31b-it',
      label: 'Gemma 4 31B',
      description: 'Balanced instruction model'
    },
    {
      id: 'google/gemma-2-2b-it',
      label: 'Gemma 2 2B',
      description: 'Lightweight and quick'
    }
  ];

  const DEFAULT_MODEL = MODEL_OPTIONS[0].id;

  function normalizeModelId(modelId) {
    const value = String(modelId || '').trim().toLowerCase();
    if (!value) return DEFAULT_MODEL;

    const known = MODEL_OPTIONS.find((option) => option.id === value);
    return known ? known.id : DEFAULT_MODEL;
  }

  function getStoredModel() {
    return normalizeModelId(localStorage.getItem(STORAGE_KEYS.model));
  }

  function saveModel(modelId) {
    const normalized = normalizeModelId(modelId);
    localStorage.setItem(STORAGE_KEYS.model, normalized);
    return normalized;
  }

  function populateModelSelect(selectElement, selectedModelId) {
    if (!selectElement) return DEFAULT_MODEL;

    const chosen = normalizeModelId(selectedModelId || getStoredModel() || selectElement.value);
    selectElement.innerHTML = MODEL_OPTIONS.map((option) => {
      return `<option value="${option.id}">${option.label}${option.description ? ' - ' + option.description : ''}</option>`;
    }).join('');
    selectElement.value = chosen;
    return selectElement.value;
  }

  function getProxyCandidates() {
    const candidates = [];
    const override = localStorage.getItem(STORAGE_KEYS.proxyUrl);
    if (override && override.trim()) {
      candidates.push(override.trim());
    }

    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocalhost) {
      candidates.push('http://127.0.0.1:8080');
      candidates.push('http://localhost:8080');
    } else {
      candidates.push('https://blockflow-proxy.jarvis-cf.workers.dev');
      candidates.push('http://127.0.0.1:8080');
    }

    return Array.from(new Set(candidates));
  }

  async function postChatCompletion(payload, options) {
    const apiKey = options?.apiKey;
    const signal = options?.signal;
    const candidates = getProxyCandidates();
    const errors = [];

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload),
          signal
        });

        if (response.ok) {
          return { response, endpoint: candidate };
        }

        if (response.status === 404) {
          errors.push(`${candidate} returned 404`);
          continue;
        }

        return { response, endpoint: candidate };
      } catch (error) {
        errors.push(`${candidate}: ${error.message}`);
      }
    }

    throw new Error(errors.length > 0 ? `No NVIDIA proxy responded. ${errors[0]}` : 'No NVIDIA proxy responded.');
  }

  return {
    MODEL_OPTIONS,
    DEFAULT_MODEL,
    STORAGE_KEYS,
    normalizeModelId,
    getStoredModel,
    saveModel,
    populateModelSelect,
    getProxyCandidates,
    postChatCompletion
  };
})();