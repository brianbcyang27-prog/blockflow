var Materials = (function() {
  'use strict';

  var STORAGE_KEY = 'blockflow_materials';
  var MAX_TEXT_SIZE = 1024 * 1024;
  var MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  var materials = [];

  function init() {
    loadFromStorage();
  }

  function loadFromStorage() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      if (data) materials = JSON.parse(data);
    } catch (e) { materials = []; }
  }

  function saveToStorage() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(materials)); } catch (e) {}
  }

  function generateId() {
    return 'mat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }

  function detectFileType(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    var mime = file.type || '';

    if (mime.indexOf('image/') === 0 || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].indexOf(ext) !== -1) {
      return 'image';
    }
    if (mime === 'application/pdf' || ext === 'pdf') {
      return 'pdf';
    }
    if (mime.indexOf('video/') === 0 || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].indexOf(ext) !== -1) {
      return 'video';
    }
    if (['xlsx', 'xls'].indexOf(ext) !== -1) {
      return 'spreadsheet';
    }
    return 'text';
  }

  function readAsBase64(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        var result = reader.result;
        var base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = function() { reject(new Error('Failed to read file')); };
      reader.readAsDataURL(file);
    });
  }

  function readAsText(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = function() { reject(new Error('Failed to read file')); };
      reader.readAsText(file);
    });
  }

  async function extractTextFromPDF(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js library not loaded');
    }

    var arrayBuffer = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    var textContent = '';

    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var content = await page.getTextContent();
      var pageText = content.items.map(function(item) { return item.str; }).join(' ');
      textContent += pageText + '\n\n';
    }

    return textContent.trim();
  }

  async function extractVideoMetadata(file) {
    return new Promise(function(resolve, reject) {
      var video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = function() {
        var metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          name: file.name,
          size: file.size,
          type: file.type
        };
        URL.revokeObjectURL(video.src);
        resolve(metadata);
      };

      video.onerror = function() {
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  function extractTextFromImage(base64Data, mimeType) {
    var apiKey = localStorage.getItem('blockflow_nvidia_key');
    if (!apiKey) throw new Error('NVIDIA API key not configured. Go to Settings > AI to set it up.');

    var payload = {
      model: 'meta/llama-3.2-11b-vision-instruct',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: 'data:' + mimeType + ';base64,' + base64Data
            }
          },
          {
            type: 'text',
            text: 'Extract all text from this image. Return the raw text content only, preserving formatting and structure. Do not summarize or describe the image.'
          }
        ]
      }],
      temperature: 0.1,
      max_tokens: 2048
    };

    var candidates = [];
    var override = localStorage.getItem('blockflow_proxy_url');
    if (override && override.trim()) candidates.push(override.trim());
    var hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      candidates.push('http://127.0.0.1:8080');
    } else {
      candidates.push('https://blockflow-proxy.jarvis-cf.workers.dev');
    }

    return postWithTimeout(candidates, payload, apiKey, 15000);
  }

  function summarizeText(text, fileName) {
    var apiKey = localStorage.getItem('blockflow_nvidia_key');
    if (!apiKey) return Promise.resolve('No summary available (API key not configured).');

    var model = 'meta/llama-3.1-8b-instruct';
    try {
      if (typeof NvidiaConfig !== 'undefined') {
        model = NvidiaConfig.getStoredModel() || model;
      }
    } catch (e) {}

    var truncated = text.length > 4000 ? text.slice(0, 4000) : text;

    var payload = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a document summarizer. Create a concise summary of the provided text. Include key points, main topics, and any action items if present. Keep summary under 200 words.'
        },
        {
          role: 'user',
          content: 'Summarize this document (' + fileName + '):\n\n' + truncated
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    };

    var candidates = [];
    var override = localStorage.getItem('blockflow_proxy_url');
    if (override && override.trim()) candidates.push(override.trim());
    var hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      candidates.push('http://127.0.0.1:8080');
    } else {
      candidates.push('https://blockflow-proxy.jarvis-cf.workers.dev');
    }

    return postWithTimeout(candidates, payload, apiKey, 15000);
  }

  function postWithTimeout(candidates, payload, apiKey, timeoutMs) {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeoutMs);

    function tryNext(index) {
      if (index >= candidates.length) {
        clearTimeout(timer);
        return Promise.reject(new Error('All proxies failed'));
      }
      return fetch(candidates[index], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).then(function(response) {
        clearTimeout(timer);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      }).then(function(data) {
        return data.choices && data.choices[0] && data.choices[0].message
          ? data.choices[0].message.content
          : '';
      }).catch(function() {
        return tryNext(index + 1);
      });
    }

    return tryNext(0);
  }

  async function processFile(file) {
    var fileType = detectFileType(file);

    var sizeLimit = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_TEXT_SIZE;
    if (fileType === 'video') sizeLimit = 50 * 1024 * 1024;
    if (file.size > sizeLimit) {
      throw new Error('File too large (' + Math.round(file.size / 1024) + 'KB). Max: ' + Math.round(sizeLimit / 1024) + 'KB');
    }

    var extractedText = '';
    var metadata = {};

    if (fileType === 'image') {
      var base64 = await readAsBase64(file);
      extractedText = await extractTextFromImage(base64, file.type || 'image/png');
    } else if (fileType === 'pdf') {
      extractedText = await extractTextFromPDF(file);
    } else if (fileType === 'video') {
      metadata = await extractVideoMetadata(file);
      extractedText = 'Video file: ' + file.name + '\nDuration: ' + formatDuration(metadata.duration) + '\nResolution: ' + metadata.width + 'x' + metadata.height;
    } else {
      extractedText = await readAsText(file);
    }

    var summary = '';
    try {
      if (fileType === 'video') {
        summary = 'Video material: ' + file.name + ' (' + formatDuration(metadata.duration) + ', ' + metadata.width + 'x' + metadata.height + ')';
      } else {
        summary = await summarizeText(extractedText, file.name);
      }
    } catch (e) {
      summary = 'Summarization failed: ' + e.message;
    }

    var material = {
      id: generateId(),
      name: file.name,
      type: fileType,
      mimeType: file.type || '',
      size: file.size,
      extractedText: extractedText,
      summary: summary,
      tags: generateTags(file.name, extractedText),
      source: 'upload',
      metadata: metadata,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    addMaterial(material);
    return material;
  }

  function formatDuration(seconds) {
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function generateTags(fileName, text) {
    var tags = [];
    var lower = (fileName + ' ' + text).toLowerCase();
    var tagKeywords = {
      'meeting': ['meeting', 'standup', 'sprint', 'retrospective', 'sync'],
      'slides': ['slide', 'presentation', 'deck', 'pitch'],
      'report': ['report', 'summary', 'analysis', 'quarterly'],
      'notes': ['notes', 'minutes', 'action items', 'decisions'],
      'code': ['code', 'function', 'class', 'import', 'def ', 'async'],
      'design': ['design', 'figma', 'mockup', 'wireframe', 'ui']
    };

    Object.keys(tagKeywords).forEach(function(tag) {
      if (tagKeywords[tag].some(function(kw) { return lower.indexOf(kw) !== -1; })) {
        tags.push(tag);
      }
    });

    return tags;
  }

  function addMaterial(material) {
    materials.unshift(material);
    saveToStorage();
    notifyListeners('add', material);
  }

  function deleteMaterial(id) {
    materials = materials.filter(function(m) { return m.id !== id; });
    saveToStorage();
    notifyListeners('delete', { id: id });
  }

  function getMaterials(filter) {
    if (!filter) return materials.slice();
    return materials.filter(function(m) {
      if (filter.type && m.type !== filter.type) return false;
      return true;
    });
  }

  function getMaterial(id) {
    return materials.find(function(m) { return m.id === id; }) || null;
  }

  function searchMaterials(query) {
    if (!query) return materials.slice();
    var lower = query.toLowerCase();
    return materials.filter(function(m) {
      return (m.name && m.name.toLowerCase().indexOf(lower) !== -1) ||
             (m.summary && m.summary.toLowerCase().indexOf(lower) !== -1) ||
             (m.extractedText && m.extractedText.toLowerCase().indexOf(lower) !== -1) ||
             (m.tags && m.tags.some(function(t) { return t.toLowerCase().indexOf(lower) !== -1; }));
    });
  }

  function findRelevantMaterials(eventTitle, eventDate) {
    if (!eventTitle) return [];
    var titleWords = eventTitle.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2; });

    return materials.filter(function(m) {
      var searchText = ((m.name || '') + ' ' + (m.summary || '') + ' ' + (m.tags || []).join(' ')).toLowerCase();
      return titleWords.some(function(word) { return searchText.indexOf(word) !== -1; });
    }).sort(function(a, b) {
      var aMatches = titleWords.filter(function(w) { return ((a.name || '') + ' ' + (a.summary || '')).toLowerCase().indexOf(w) !== -1; }).length;
      var bMatches = titleWords.filter(function(w) { return ((b.name || '') + ' ' + (b.summary || '')).toLowerCase().indexOf(w) !== -1; }).length;
      return bMatches - aMatches;
    });
  }

  var listeners = [];
  function onChanges(callback) { listeners.push(callback); }
  function notifyListeners(type, data) {
    listeners.forEach(function(cb) { try { cb(type, data); } catch (e) {} });
  }

  return {
    init: init,
    processFile: processFile,
    addMaterial: addMaterial,
    deleteMaterial: deleteMaterial,
    getMaterials: getMaterials,
    getMaterial: getMaterial,
    searchMaterials: searchMaterials,
    findRelevantMaterials: findRelevantMaterials,
    detectFileType: detectFileType,
    onChanges: onChanges
  };
})();

Materials.init();
