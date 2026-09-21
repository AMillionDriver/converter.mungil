export interface FileMetadata {
  format: string;
  width?: number;
  height?: number;
  duration?: number; // for video/audio
  size: number;
  created: Date;
  modified: Date;
  exif?: Record<string, unknown>;
}

export interface MetadataOperation {
  type: 'read' | 'edit' | 'delete';
  targetKeys: string[];
  values?: Record<string, unknown>;
}

export class MetadataManager {
  static async readMetadata(file: File): Promise<FileMetadata> {
    console.log(`[Metadata] Reading metadata for ${file.name}...`);

    // Mock implementation: In reality, would use libraries like exifr or custom WASM parsers
    return {
      format: file.type,
      size: file.size,
      created: new Date(file.lastModified),
      modified: new Date(file.lastModified),
      exif: {
        Make: 'Mock Camera',
        Model: 'FlowyCam 1.0',
        Software: 'FlowyConverter',
      },
    };
  }

  static async applyChanges(file: File, op: MetadataOperation): Promise<Blob> {
    console.log(`[Metadata] Applying ${op.type} operation...`);

    // Mock implementation
    return new Blob([file], { type: file.type });
  }
}
