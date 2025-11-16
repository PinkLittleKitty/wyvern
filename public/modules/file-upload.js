// File Upload Manager
export class FileUploadManager {
  constructor() {
    this.selectedFiles = [];
    this.uploadButton = document.getElementById('upload-button');
    this.fileInput = document.getElementById('file-input');
    this.filePreview = document.getElementById('file-preview');
    
    this.init();
  }

  init() {
    if (this.uploadButton && this.fileInput) {
      this.uploadButton.addEventListener('click', () => this.fileInput.click());
      this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    window.removeFile = (index) => this.remove(index);
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.selectedFiles = [...this.selectedFiles, ...files];
    this.updatePreview();
    this.fileInput.value = '';
  }

  updatePreview() {
    if (this.selectedFiles.length === 0) {
      this.filePreview.classList.remove('show');
      this.filePreview.innerHTML = '';
      return;
    }

    this.filePreview.classList.add('show');
    this.filePreview.innerHTML = this.selectedFiles.map((file, index) => {
      const isImage = file.type.startsWith('image/');
      const fileSize = this.formatSize(file.size);
      
      if (isImage) {
        const url = URL.createObjectURL(file);
        return `
          <div class="file-preview-item">
            <img src="${url}" alt="${file.name}" />
            <div class="file-preview-info">
              <div class="file-preview-name">${file.name}</div>
              <div class="file-preview-size">${fileSize}</div>
            </div>
            <button class="file-preview-remove" onclick="removeFile(${index})">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
      } else {
        return `
          <div class="file-preview-item">
            <div class="file-icon">
              <i class="fas fa-file"></i>
            </div>
            <div class="file-preview-info">
              <div class="file-preview-name">${file.name}</div>
              <div class="file-preview-size">${fileSize}</div>
            </div>
            <button class="file-preview-remove" onclick="removeFile(${index})">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
      }
    }).join('');
  }

  remove(index) {
    this.selectedFiles.splice(index, 1);
    this.updatePreview();
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  async upload() {
    if (this.selectedFiles.length === 0) return [];

    const formData = new FormData();
    this.selectedFiles.forEach(file => formData.append('files', file));

    try {
      const token = sessionStorage.getItem('wyvernToken');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      return data.files;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  clear() {
    this.selectedFiles = [];
    this.updatePreview();
  }

  hasFiles() {
    return this.selectedFiles.length > 0;
  }
}
