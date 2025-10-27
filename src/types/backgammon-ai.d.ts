declare module '@nodots-llc/backgammon-ai' {
  // Minimal ambient types to allow CLI build without requiring AI build first
  export class DatasetWriter {
    constructor(opts: { outDir: string; shardSize?: number; writeCSV?: boolean; dedupByFeatureHash?: boolean })
    write(record: any): Promise<void>
    close(): Promise<void>
  }

  export function initializeGnubgHints(options?: { weightsPath?: string; config?: Record<string, any> }): Promise<void>
  export function configureGnubgHints(config: Record<string, any>): Promise<void>
  export function getMoveHints(request: any, maxHints?: number): Promise<any[]>
  export function buildHintContextFromGame(game: any): { request: any; normalization?: any }
  export function buildLabeledSampleFromPlay(play: any, turnIdx: number, plyIdx: number): Promise<any | null>
}

